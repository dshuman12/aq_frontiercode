// TODO: move this to credit card onboarding service when live

import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { formatJSONResponse } from "@libs/gatewayUtils";
import { getParameter } from "@onmoapp/onmo-ssm";

type HandlerEvent = { requestContext: { identity: { userAgent: string } } };
type RedirectURLConfig = { wrong_device_url: string; android_url: string; iOS_url: string };

const env = process.env.ENVIRONMENT as string;
const download_app_redirect_url_config = process.env.DOWNLOAD_APP_REDIRECT_URL_CONFIG as string;

export const handler = async (event: HandlerEvent) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  try {
    logger.debug(event);

    const { userAgent } = event?.requestContext?.identity;
    if (!userAgent) {
      throw new Error("Missing userAgent in request context");
    }

    const { Parameter } = await getParameter({
      Name: download_app_redirect_url_config,
    });
    if (!Parameter?.Value) {
      throw new Error(`Failed to fetch app tester login config parameter from ssm`);
    }
    const { wrong_device_url, android_url, iOS_url } = JSON.parse(
      Parameter.Value,
    ) as RedirectURLConfig;
    logger.addContext({ wrong_device_url, android_url, iOS_url });

    if (!wrong_device_url) {
      throw new Error("Missing wrong_device_url in SSM param");
    }
    if (!android_url) {
      throw new Error("Missing android_url in SSM param");
    }
    if (!iOS_url) {
      throw new Error("Missing iOS_url in SSM param");
    }
    logger.info("Download app redirect url config retrieved successfully");

    if (userAgent.includes("Android")) {
      logger.info("Device is mobile Android returning google play store url");
      return formatJSONResponse({ statusCode: 302, headers: { Location: android_url } });
    }
    //
    else if (
      userAgent.includes("iPhone") ||
      userAgent.includes("iPad") ||
      userAgent.includes("iPod")
    ) {
      logger.info("Device is mobile Android returning google play store url");
      return formatJSONResponse({ statusCode: 302, headers: { Location: iOS_url } });
    }
    //
    else {
      logger.warn("Device is not mobile Android or iOS, returning wrong device url");
      return formatJSONResponse({ statusCode: 302, headers: { Location: wrong_device_url } });
    }
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    const error_url = env === "prod" ? `https://onmo.app/500` : `https://staging.onmo.app/500`;
    return formatJSONResponse({ statusCode: 302, headers: { Location: error_url } });
  }
};
