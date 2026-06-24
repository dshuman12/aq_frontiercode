import { PaymentMethod } from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';

export type VerificationStage =
  | 'request-recorded'
  | 'extracting-details'
  | 'duplicate-check'
  | 'amount-check'
  | 'receiver-check'
  | 'timestamp-check'
  | 'finalizing';

export interface VerificationStageEvent {
  stage: VerificationStage;
  depositRequestId: string;
  detail?: string;
}

export interface VerificationOptions {
  onStage?: (event: VerificationStageEvent) => Promise<void> | void;
}

// ── Bulk types ────────────────────────────────────────────────────────────────

export interface BulkReceiptInput {
  amount: number;
  date: string;
  bankName: string;
  transactionId: string;
  receiverAccount: string;
  receiverName: string;
  rawProof: string | null;
  telegramFileId: string | null;
}

export interface BulkVerifyPayload {
  userId: string;
  paymentMethod: PaymentMethod;
  verMethod: VerificationMethod;
  receipts: BulkReceiptInput[];
  clientId?: string | null;
  checkoutId?: string | null;
}

export type BulkPipelineResult =
  | {
      status: 'PASS';
      verifiedReceipts: Array<{
        depositRequestId: string;
        transactionId: string;
        amount: number;
      }>;
    }
  | {
      status: 'FAIL';
      failedIndex: number;
      reason: string;
    }
  | {
      status: 'AMBIGUOUS';
      failedIndex: number;
      depositRequestId: string;
    };
export interface SingleVerifyPayload {
  email: string;
  amount: number;
  paymentMethod: PaymentMethod;
  verMethod: VerificationMethod;
  rawProof: string | null;
  telegramFileId?: string | null;
  userId: string;
  accountNumber?: string;
  clientId?: string | null;
  checkoutId?: string | null;
}

export interface ExtractReceiptPayload {
  paymentMethod: PaymentMethod;
  verMethod: VerificationMethod;
  rawProof: string | null;
  telegramFileId: string | null;
  amount: number;
  userId: string;
}
// ── Fallback message ──────────────────────────────────────────────────────────

export const UNEXPECTED_ERROR_MESSAGE =
  `An unexpected error occurred while processing your request. ` +
  `Please try again. If the problem persists, contact support.`;
