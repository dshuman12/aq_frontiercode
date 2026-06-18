import { Logger } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getCurrentTimestampInSeconds, hasRecordExpired, toLMSResult } from "@libs/utils";
import { deleteItemMethod, queryTableMethod, updateItemMethod } from "@onmoapp/onmo-dynamodb";
import {
  AUTH_TRANSACTIONS_TABLE,
  ENV,
  EXTRA_SCOPE_AUTH_FLOW,
  LOGGING_LEVEL,
  OTP_ATTEMPT_LIMIT,
  OTP_EXPIRED_RESEND,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  OTP_SEND_LIMIT,
  PHONE_NUMBER_CHANGE_FLOW,
} from "@libs/constants";
import { AuthorizerEvent, checkRateLimit } from "@libs/shared";
import { z } from "zod";
import { toHttpResponse } from "@onmoapp/core-banking";
import { BankingService } from "@services/banking/bankingService";

type HandlerEvent = AuthorizerEvent & {
  pathParameters: { transaction_id?: string };
};

type ParsedBody = {
  verify_code?: string | number;
};

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ ENV }, LOGGING_LEVEL);

  const { transaction_id } = event.pathParameters;
  const forcedCodePath = event.headers?.["x-force-hal"];
  let parsedBody;

  try {
    if (!transaction_id) {
      throw new Error("Missing transaction_id in path parameters");
    }
    logger.addContext({ transaction_id });

    const { onmouuid: authOnmouuid } = event?.requestContext?.authorizer;
    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }
    logger.addContext({ authOnmouuid });

    try {
      parsedBody = JSON.parse(event.body) as ParsedBody;
    } catch (error: any) {
      logger.error(`Failed to parse request body: ${error?.message || error}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Invalid request body" } });
    }

    const { verify_code } = parsedBody;
    if (!verify_code) {
      logger.warn("Missing verification code in request body");
      return formatJSONResponse({
        statusCode: 400,
        body: { message: "Missing verification code" },
      });
    }
    logger.addContext({ verify_code });

    // Query transaction record
    const queryTransactionsTableRes = await queryTableMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": transaction_id },
    });
    if (!queryTransactionsTableRes?.Items?.length) {
      logger.warn(`No transaction found in ${AUTH_TRANSACTIONS_TABLE}`);
      return formatJSONResponse({ statusCode: 400, body: { message: "Transaction not found" } });
    }

    const transactionResult = z
      .object({
        onmouuid: z.string().refine((it) => it === authOnmouuid),
        auth_flow: z.string().refine((it) => it === EXTRA_SCOPE_AUTH_FLOW),
        extra_scope_flow: z.string().refine((it) => it === PHONE_NUMBER_CHANGE_FLOW),
        new_phone_number: z.string(),
        verify_code: z.string(),
        phone_validation_expiry_time: z.number(),
        phone_validation_status: z.string().refine((it) => it === "pending"),
        phone_validation_attempt_count: z
          .number()
          .optional()
          .transform((it) => it || 0),
        next_endpoint: z
          .string()
          .refine((it) => it === `${transaction_id}/phone-change/otp/verify`),
        ttl: z.number().refine((it) => !hasRecordExpired(it)),
        phone_validation_send_count: z
          .number()
          .optional()
          .transform((val) => val || 1),
      })
      .safeParse(queryTransactionsTableRes.Items[0]);

    if (!transactionResult.success) {
      logger.error(transactionResult.error);
      return toHttpResponse(toLMSResult(transactionResult));
    }

    const {
      onmouuid,
      auth_flow,
      extra_scope_flow,
      verify_code: stored_verify_code,
      phone_validation_expiry_time,
      phone_validation_send_count,
      phone_validation_attempt_count,
    } = transactionResult.data;

    logger.addContext({ transaction: transactionResult.data });

    // Check rate limiting
    const rateLimiter = await checkRateLimit(
      {
        onmouuid,
        domain: "auth_extra_scope",
        action: "authorize",
      },
      logger,
    );

    if (rateLimiter) return rateLimiter;

    logger.addContext({ auth_flow, extra_scope_flow });

    // Check if the OTP verification has expired
    const currentTime = getCurrentTimestampInSeconds();
    if (currentTime > phone_validation_expiry_time) {
      logger.warn(
        `OTP verification has expired. Expiry time: ${phone_validation_expiry_time}, current time: ${currentTime}`,
      );

      // OTP send limit reached -> restart flow
      if (phone_validation_send_count >= OTP_SEND_LIMIT) {
        logger.warn(`Transaction has reached total OTP send limit of ${OTP_SEND_LIMIT}`);

        logger.info("Voiding transaction");
        try {
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
          logger.info("Transaction successfully voided");
        } catch (error: any) {
          logger.error(`Failed to void transaction: ${error?.message || error}`);
        }

        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_EXPIRED_SEND_LIMIT_REACHED,
            next_endpoint: `${transaction_id}/phone-change/otp/send`,
          },
        });
      }
      // OTP send limit not yet reached -> resend
      else {
        const otp_resend_endpoint = `${transaction_id}/phone-change/otp/send`;
        try {
          await updateItemMethod({
            TableName: AUTH_TRANSACTIONS_TABLE,
            Key: { transaction_id },
            UpdateExpression: "set next_endpoint = :next_endpoint",
            ExpressionAttributeValues: { ":next_endpoint": otp_resend_endpoint },
          });
        } catch (error: any) {
          throw new Error(`Error updating transaction: ${error?.message || error}`);
        }

        return formatJSONResponse({
          statusCode: 422,
          body: { error_code: OTP_EXPIRED_RESEND, next_endpoint: otp_resend_endpoint },
        });
      }
    }

    // Get current attempt count and increment it
    const new_phone_validation_attempt_count = phone_validation_attempt_count + 1;
    logger.addContext({ phone_validation_attempt_count: new_phone_validation_attempt_count });

    // Verify OTP code
    if (verify_code.toString() !== stored_verify_code.toString()) {
      logger.warn(
        `Invalid verification code. Expected: ${stored_verify_code}, received: ${verify_code}`,
      );

      if (new_phone_validation_attempt_count >= OTP_ATTEMPT_LIMIT) {
        logger.warn(`Transaction has reached total OTP attempt limit of ${OTP_ATTEMPT_LIMIT}`);

        logger.info("Voiding transaction");
        try {
          await deleteItemMethod({ TableName: AUTH_TRANSACTIONS_TABLE, Key: { transaction_id } });
          logger.info("Transaction successfully voided");
        } catch (error: any) {
          logger.error(`Failed to void transaction: ${error?.message || error}`);
        }

        return formatJSONResponse({
          statusCode: 422,
          body: {
            error_code: OTP_INVALID_ATTEMPT_LIMIT_REACHED,
            next_endpoint: `${transaction_id}/phone-change/otp/send`,
          },
        });
      }

      const otp_verify_endpoint = `${transaction_id}/phone-change/otp/verify`;
      try {
        await updateItemMethod({
          TableName: AUTH_TRANSACTIONS_TABLE,
          Key: { transaction_id },
          UpdateExpression:
            "set phone_validation_attempt_count = :attemptCount, next_endpoint = :next_endpoint",
          ExpressionAttributeValues: {
            ":attemptCount": new_phone_validation_attempt_count,
            ":next_endpoint": otp_verify_endpoint,
          },
        });
      } catch (error: any) {
        throw new Error(`Error updating transaction: ${error?.message || error}`);
      }

      return formatJSONResponse({
        statusCode: 422,
        body: { error_code: OTP_INVALID_REATTEMPT, next_endpoint: otp_verify_endpoint },
      });
    }

    // Get user's email address from core banking system
    const service = await BankingService.init(onmouuid, logger, forcedCodePath);
    const customerDetails = await service.customerSummary();
    if (!customerDetails.ok) return toHttpResponse(customerDetails);

    const email_address = customerDetails.data.email;
    logger.info(`Retrieved email: ${email_address}`);

    // OTP verification successful - now proceed to email verification
    const next_endpoint_email = `${transaction_id}/phone-change/email/send`;

    // Update transaction record with phone validation success and user email
    await updateItemMethod({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id },
      UpdateExpression: `set ${[
        "phone_validation_status = :phoneValidationStatus",
        "verification_steps_completed = list_append(if_not_exists(verification_steps_completed, :emptyList), :phoneStep)",
        "next_endpoint = :nextEndpoint",
        "phone_validation_verified_time = :verifiedTime",
        "phone_validation_attempt_count = :attemptCount",
        "email = :email",
      ].join(", ")}`,
      ExpressionAttributeValues: {
        ":phoneValidationStatus": "verified",
        ":emptyList": [],
        ":phoneStep": ["PHONE_VALIDATED"],
        ":nextEndpoint": next_endpoint_email,
        ":verifiedTime": currentTime,
        ":attemptCount": new_phone_validation_attempt_count,
        ":email": email_address,
      },
    });
    logger.info(`Updated transaction with OTP verification success and user email`);

    logger.info(`Phone OTP verification process completed successfully`);
    return formatJSONResponse({
      statusCode: 200,
      body: {
        message: "Phone number verification successful",
        next_endpoint: next_endpoint_email,
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error";
    logger.error(`Something went wrong: ${errorMessage}`);
    logger.error(`Error stack: ${error?.stack || "No stack trace available"}`);

    // More detailed error response for easier debugging
    return formatJSONResponse({
      statusCode: 500,
      body: {
        message: "Something went wrong",
        error: process.env.ENVIRONMENT === "development" ? errorMessage : undefined,
      },
    });
  }
};
