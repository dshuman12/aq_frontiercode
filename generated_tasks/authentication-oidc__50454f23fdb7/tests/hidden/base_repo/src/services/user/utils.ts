import { LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";
import { logger } from "@onmoapp/logger";
import { QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { toLMSResult } from "@libs/utils";
import { userTableResponseSchema, User, UserRecords } from "@services/user/interface";

export function toUserRecords(result: LMSResult<QueryCommandOutput>): LMSResult<UserRecords> {
  if (!result.ok) {
    logger.addContext("error", result.error);
    logger.error("QueryCommandOutput error");
    return result;
  }

  if (result.data.Count === 0) {
    return LMSFailure({
      type: "NOT_FOUND_ERROR",
      message: "no user record found for query",
    });
  }

  const user = userTableResponseSchema.safeParse(result.data);

  if (!user.success) {
    logger.addContext("error", user.error);
    logger.error("user schema parse error");
  }
  return toLMSResult(user);
}

export function toUserRecord(result: LMSResult<QueryCommandOutput>): LMSResult<User> {
  const records = toUserRecords(result);
  if (!records.ok) return records;

  if (records.data.length > 1) {
    const msg = "multiple records found for query";
    logger.error(msg);
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: msg,
    });
  }

  return LMSSuccess(records.data[0]);
}
