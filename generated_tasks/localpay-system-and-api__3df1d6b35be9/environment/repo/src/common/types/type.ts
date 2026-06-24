import { PaymentMethod } from '@prisma/client';
import {
  VerificationStage,
  VerificationStageEvent,
} from 'src/verification/validators/type';

export const FINAL_STATUS_SUMMARY: Record<string, string> = {
  PASS: 'Everything looks good—just finishing up and sending your confirmation.',
  FAIL_RETRYABLE:
    'We spotted a mismatch; you can use the retry button to try once more.',
  FAIL_HARD: 'Verification failed; please contact support if you need help.',
  AMBIGUOUS:
    'It has been forwarded for manual review; we will update you here shortly.',
};

export const STAGE_MESSAGES: Record<
  VerificationStage,
  (event: VerificationStageEvent) => string
> = {
  'request-recorded': ({ depositRequestId }) =>
    `✅ Deposit request #${depositRequestId} is tracking your proof now.`,
  'extracting-details': () =>
    '🧾 Extracting the transaction details from the proof you shared...',
  'duplicate-check': () =>
    '🔎 Checking that this transaction has not been used before, so your balance stays accurate.',
  'amount-check': () =>
    '💰 Matching the received amount with the number you requested to add.',
  'receiver-check': () =>
    '🏦 Confirming the payment landed in the correct receiving account.',
  'timestamp-check': () =>
    '⏱️ Making sure the payment time looks recent and valid.',
  finalizing: (event) => {
    const summary =
      FINAL_STATUS_SUMMARY[event.detail ?? ''] ?? 'We are wrapping things up.';
    return `🎯 Finalizing deposit #${event.depositRequestId}. ${summary}`;
  },
};
export interface ResolvedProof {
  rawProof: string | null;
  telegramFileId: string | null; // full URL — for OCR/verification
  telegramPhotoFileId: string | null; // raw file_id — for sendPhoto to admin
}

export interface ReceivingAccountDisplay {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const BANK_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CBE]: 'CBE Birr',
  [PaymentMethod.TELEBIRR]: 'Telebirr',
  [PaymentMethod.EBIRR]: 'E-Birr',
  [PaymentMethod.ABYSSINIA]: 'Abyssinia Bank',
  [PaymentMethod.NIB]: 'NIB Bank',
};
export type PipelineResult =
  | { status: 'PASS'; transactionId: string; depositRequestId: string }
  | { status: 'FAIL_RETRYABLE'; reason: string; depositRequestId: string }
  | { status: 'FAIL_HARD'; reason: string; depositRequestId: string }
  | { status: 'AMBIGUOUS'; depositRequestId: string };
export const CAPTIONS: Record<string, string> = {
  LINK:
    `📎 Send Transaction Link\n\n` +
    `After completing your payment, open your banking app,\n` +
    `find the transaction and tap Share or Copy Link.\n\n` +
    `Then paste it here 👇`,

  SCREENSHOT:
    `📷 Upload Payment Screenshot\n\n` +
    `Take a clear screenshot of your payment confirmation\n` +
    `and send it here as a photo (not a file).\n\n` +
    `Make sure these are clearly visible:\n` +
    `• Amount\n• Transaction ID\n• Date & Time\n• Receiver name`,

  SMS:
    `💬 Forward Payment SMS\n\n` +
    `Forward the confirmation SMS you received from your bank\n` +
    `directly into this chat.\n\n` +
    `The SMS should contain the transaction amount\n` +
    `and a link or reference number.`,
};
