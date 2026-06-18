import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { authCodeRequest } from "./token.auth_code";
import { refreshTokenRequest } from "./token.refresh_token";

const env = process.env.ENVIRONMENT as string;

export const handler = async (event: { body: string }) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  try {
    const { refresh_token } = JSON.parse(event.body);

    return refresh_token
      ? await refreshTokenRequest({ event, logger })
      : await authCodeRequest({ event, logger });
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return formatJSONResponse({ statusCode: 500, body: { message: "Something went wrong" } });
  }
};
