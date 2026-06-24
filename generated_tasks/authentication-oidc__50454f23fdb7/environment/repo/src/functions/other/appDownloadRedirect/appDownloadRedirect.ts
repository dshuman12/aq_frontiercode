// TODO: move this to credit card onboarding service when live

import {
  createApiHandler,
  APIGatewayProxyEvent,
  apiResponse,
  ApiResponse,
} from "@onmoapp/handler-middleware";
import { logger, serializeError } from "@onmoapp/logger";
import { getParameter } from "@onmoapp/onmo-ssm";
import { DOWNLOAD_APP_REDIRECT_URL_CONFIG, FRONTEND_URL } from "@libs/config";
import { z } from "zod";

type RedirectURLConfig = { wrong_device_url: string; android_url: string; iOS_url: string };

const eventSchema = z.object({
  requestContext: z.object({
    identity: z.object({ userAgent: z.string() }),
  }),
});

const appDownloadRedirect = async (event: APIGatewayProxyEvent): Promise<ApiResponse> => {
  try {
    const parsedEvent = eventSchema.safeParse(event);
    if (!parsedEvent.success) {
      logger.warn(`Event validation failed: ${serializeError(parsedEvent.error)}`);
      return apiResponse(302, undefined, { Location: `${FRONTEND_URL}/500` });
    }

    const { userAgent } = parsedEvent.data.requestContext.identity;

    const { Parameter } = await getParameter({
      Name: DOWNLOAD_APP_REDIRECT_URL_CONFIG,
    });
    if (!Parameter?.Value) {
      throw new Error(`Failed to fetch app tester login config parameter from ssm`);
    }
    const { wrong_device_url, android_url, iOS_url } = JSON.parse(
      Parameter.Value,
    ) as RedirectURLConfig;
    logger.addContext("wrong_device_url", wrong_device_url);
    logger.addContext("android_url", android_url);
    logger.addContext("iOS_url", iOS_url);

    if (!wrong_device_url) {
      throw new Error("Missing wrong_device_url in SSM param");
    }
    if (!android_url) {
      throw new Error("Missing android_url in SSM param");
    }
    if (!iOS_url) {
      throw new Error("Missing iOS_url in SSM param");
    }

    if (userAgent.includes("Android")) {
      return apiResponse(302, undefined, { Location: android_url });
    }
    //
    else if (
      userAgent.includes("iPhone") ||
      userAgent.includes("iPad") ||
      userAgent.includes("iPod")
    ) {
      return apiResponse(302, undefined, { Location: iOS_url });
    }
    //
    else {
      logger.warn("Device is not mobile Android or iOS, returning wrong device url");
      return apiResponse(302, undefined, { Location: wrong_device_url });
    }
  } catch (error: any) {
    logger.error(`Something went wrong: ${error?.message || error}`);
    return apiResponse(302, undefined, { Location: `${FRONTEND_URL}/500` });
  }
};

export const handler =
  createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(appDownloadRedirect);
