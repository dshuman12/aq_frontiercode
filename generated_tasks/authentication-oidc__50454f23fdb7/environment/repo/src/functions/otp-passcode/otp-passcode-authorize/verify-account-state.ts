import { SUPPORTED_CREDIT_ACCOUNT_STATES } from "@libs/config";
import { logger } from "@onmoapp/logger";
import { ERROR_CODES } from "@libs/constants";
import { BankingService } from "@services/banking/bankingService";

export async function verifyAccountState(customerId: string, codePath?: string): Promise<void> {
  const service = await BankingService.init(customerId, codePath);
  const accountSummary = await service.creditAccountSummary();
  if (!accountSummary.ok) {
    logger.addContext("error_code", ERROR_CODES.BANKING_SERVICE_ERROR);
    logger.addContext("accountSummary", accountSummary.error);
    logger.error("Failed to get credit account summary");
    throw new Error("Failed to get credit account summary");
  }

  const state = accountSummary.data.state;

  if (!SUPPORTED_CREDIT_ACCOUNT_STATES.includes(state)) {
    logger.addContext("error_code", ERROR_CODES.ACCOUNT_INVALID_STATE);
    throw new Error(
      `Credit card account is not in valid state. Account state is: ${state} and supported states are ${SUPPORTED_CREDIT_ACCOUNT_STATES}`,
    );
  }
}
