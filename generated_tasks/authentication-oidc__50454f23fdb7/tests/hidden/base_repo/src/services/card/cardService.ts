import axios, { AxiosInstance, isAxiosError } from "axios";
import { serializeError } from "@onmoapp/logger";
import { LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";
import { CardSummary } from "@services/banking/interface";
import {
  CARD_SERVICE_BASE_URL,
  CARD_SERVICE_MAX_RETRIES,
  CARD_SERVICE_TIMEOUT,
} from "@libs/config";
import { CardServiceInterface, cardDetailsSchema } from "./interface";
import { apiKeyProvider } from "./apiKeyProvider";
import { logger } from "@onmoapp/logger";

export class CardService extends CardServiceInterface {
  constructor(private client: AxiosInstance) {
    super();
  }

  async getCardDetails(cardId: string): Promise<LMSResult<CardSummary>> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= CARD_SERVICE_MAX_RETRIES; attempt++) {
      try {
        const apiKey = await apiKeyProvider.getApiKey();
        const response = await this.client.get(`/${cardId}`, {
          headers: { "x-api-key": apiKey },
        });

        const parsed = cardDetailsSchema.safeParse(response.data);
        if (!parsed.success) {
          logger.addContext("parsedCardDetails", parsed.error.issues);
          logger.error("Card service response validation failed");
          return LMSFailure({
            type: "VALIDATION_ERROR",
            message: "Card service response validation failed",
          });
        }

        return LMSSuccess({
          id: parsed.data.cardId,
          status: parsed.data.status,
          isActivated: parsed.data.isActivated,
        });
      } catch (error) {
        lastError = error;
        if (
          isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          apiKeyProvider.clearCache();
          if (attempt < CARD_SERVICE_MAX_RETRIES) continue;
        }
        if (!isRetryable(error) || attempt === CARD_SERVICE_MAX_RETRIES) break;
      }
    }

    logger.addContext("cardId", cardId);
    logger.addContext("cause", toSafeError(lastError));
    logger.error("Card service request failed");
    return LMSFailure({
      type: "ADAPTER_CLIENT_CALL_FAILURE_ERROR",
      message: `Failed to fetch card details for ${cardId}`,
    });
  }

  static init(
    client: AxiosInstance = axios.create({
      baseURL: CARD_SERVICE_BASE_URL,
      timeout: CARD_SERVICE_TIMEOUT,
    }),
  ) {
    return new CardService(client);
  }
}

const isRetryable = (error: unknown): boolean =>
  isAxiosError(error) && (!error.response || error.response.status >= 500);

const toSafeError = (error: unknown) => {
  if (isAxiosError(error)) {
    return { status: error.response?.status, message: error.message, url: error.config?.url };
  }
  return serializeError(error);
};
