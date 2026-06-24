import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { CARD_SERVICE_SECRET_NAME } from "@libs/config";
import { logger } from "@onmoapp/logger";

class ApiKeyProvider {
  private cachedApiKey: string | null = null;

  async getApiKey(): Promise<string> {
    if (this.cachedApiKey) return this.cachedApiKey;
    const start = performance.now();
    const { SecretString } = await getSecret(CARD_SERVICE_SECRET_NAME);
    logger.addContext("cardServiceSecretDuration", Math.round(performance.now() - start));
    if (!SecretString) throw new Error("Failed to fetch card service secret");
    const { apiKey } = JSON.parse(SecretString);
    if (!apiKey) throw new Error("Missing apiKey in card service secret");
    this.cachedApiKey = apiKey;
    return apiKey;
  }

  clearCache(): void {
    this.cachedApiKey = null;
  }
}

export const apiKeyProvider = new ApiKeyProvider();
