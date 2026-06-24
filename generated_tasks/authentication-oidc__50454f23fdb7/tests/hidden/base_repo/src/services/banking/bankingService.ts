import { coreBankingHandler } from "@onmoapp/core-banking";

import { BankingServiceInterface } from "./interface";
import { AuthBankingAdapter } from "./halBankingService";
import { MambuBankingService } from "./mambuBankingService";

import { POSTHOG_HAL_FLAG_KEY, POSTHOG_SECRET_NAME } from "@libs/config";

export class BankingService {
  static async init(id: string, codePath?: string): Promise<BankingServiceInterface> {
    return await bankingServiceFactory(id, codePath);
  }
}

const bankingServiceFactory = async (id: string, codePath?: string) =>
  await coreBankingHandler({
    id: { onmoUuid: id },
    handlers: {
      hal: () => AuthBankingAdapter.init(id),
      mambu: () => MambuBankingService.init(id),
    },
    posthog: { flagName: POSTHOG_HAL_FLAG_KEY, secretName: POSTHOG_SECRET_NAME },
    forceHal: !!codePath,
  });
