import {
  DepositStatus,
  PaymentMethod,
  VerificationCheck,
} from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';

export interface CreateDepositRequestInput {
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: DepositStatus;
  maxRetries: number;
  clientId?: string | null;
  checkoutId?: string | null;
}

export interface CreateReceiptInput {
  depositRequestId: string;
  verMethod: VerificationMethod;
  rawProof: string | null;
  telegramFileId: string | null;
  extractedTransactionId?: string | null;
}

export interface CreateCrawlResultInput {
  depositRequestId: string;
  transactionId: string;
  paymentMethod: PaymentMethod;
  verMethod: VerificationMethod;
  confirmedAmount: number;
  confirmedReceiverAccount: string;
  confirmedReceiverName: string;
  confirmedTimestamp: Date | null;
}

export interface CreateVerificationCheckInput {
  depositRequestId: string;
  check: VerificationCheck;
  passed: boolean;
  reasonCode: string | null;
  detail: string | null;
}

// ── Status map — shared by all callers ───────────────────────────────────────

export const PIPELINE_STATUS_MAP: Record<string, DepositStatus> = {
  PASS: 'VERIFIED',
  FAIL_HARD: 'REJECTED_HARD',
  FAIL_RETRYABLE: 'REJECTED_RETRYABLE',
  AMBIGUOUS: 'PENDING_MANUAL_REVIEW',
};
