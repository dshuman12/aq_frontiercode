import { formatJSONResponse } from "@libs/gatewayUtils";
import { authCodeRequest } from "./token.auth_code";
import { refreshTokenRequest } from "./token.refresh_token";
import { getLogger } from "@libs/logger";

export const handler = async (event: { body: string }) => {
  const logger = getLogger();

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
