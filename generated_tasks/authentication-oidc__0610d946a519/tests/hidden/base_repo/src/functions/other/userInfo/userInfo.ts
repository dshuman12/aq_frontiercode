import { formatJSONResponse } from "@libs/gatewayUtils";
import {
  CREDIT_CARD_ACCOUNT_ID_SCOPE,
  CREDIT_CARD_ID_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
} from "@libs/constants";
import { getLogger } from "@libs/logger";
import { UserRecordsService } from "@services/user/user";
import { BankingService } from "@services/banking/bankingService";
import { AuthorizerEvent } from "@libs/shared";

type HandlerEvent = AuthorizerEvent & {
  requestContext: { authorizer: { onmouuid: string; scope: string } };
  queryStringParameters: { onmouuid: string };
};
type HandlerRespBody = {
  loanAccountId?: string;
  credit_card_account_id?: string;
  credit_card_id?: string;
};

const errorResponse = formatJSONResponse({
  statusCode: 500,
  body: { message: "Something went wrong" },
});

export const handler = async (event: HandlerEvent) => {
  const logger = getLogger();
  const forcedCodePath = event.headers?.["x-force-hal"];

  const { onmouuid: authOnmouuid, scope } = event?.requestContext?.authorizer;
  const { onmouuid: queryOnmouuid } = event?.queryStringParameters;
  logger.addContext({ authOnmouuid, queryOnmouuid, scope });

  if (event.requestContext.authorizer) {
  }

  try {
    if (!authOnmouuid) {
      throw new Error("Missing onmouuid from authorizer");
    }
    if (!queryOnmouuid) {
      throw new Error("Missing onmouuid in query string params");
    }
    if (queryOnmouuid !== authOnmouuid) {
      throw new Error("[suspicious_activity] Authorizer onmouuid does not match query onmouuid");
    }
    if (!scope) {
      throw new Error("Missing scope from authorizer");
    }

    const scopes = scope.split(",");
    const responseBody: HandlerRespBody = {};

    const userRecordsService = new UserRecordsService(logger);
    const user = await userRecordsService.byId(queryOnmouuid);
    // setting 500 on error to maintain compatibility ~ it doesn't really make sense.
    if (!user.ok) return errorResponse;

    const bankingService = await BankingService.init(queryOnmouuid, logger, forcedCodePath);
    if (!user.data.creditAccountId) {
      return errorResponse;
    }

    // TODO: who is using loanAccountId??
    if (scopes.includes(LOAN_ACCOUNT_ID_SCOPE)) {
      // add loan account id to res
      responseBody.loanAccountId = user.data.creditAccountId;
    }

    if (scopes.includes(CREDIT_CARD_ACCOUNT_ID_SCOPE) || scopes.includes(CREDIT_CARD_ID_SCOPE)) {
      if (scopes.includes(CREDIT_CARD_ACCOUNT_ID_SCOPE)) {
        // add credit card account id to res
        const account = await bankingService.creditAccountSummary();
        if (!account.ok) {
          logger.error(account.error);
          return errorResponse;
        }

        responseBody.credit_card_account_id = account.data.id;
      }

      if (scopes.includes(CREDIT_CARD_ID_SCOPE)) {
        const card = await bankingService.cardSummary();
        if (!card.ok) {
          logger.error(card.error);
          return errorResponse;
        }
        // add card id to res
        responseBody.credit_card_id = card.data.id;
      }
    }

    return formatJSONResponse({ statusCode: 200, body: responseBody });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return errorResponse;
  }
};
