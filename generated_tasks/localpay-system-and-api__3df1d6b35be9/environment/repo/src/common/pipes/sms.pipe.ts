import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { VerificationMethod } from 'src/common/types/bot-enum';

// ── Pre-validation result ─────────────────────────────────────────────────────

export interface PreValidationResult {
  valid: boolean;
  reason?: string; // user-facing message when valid = false
}

// ── Per-bank SMS pattern config ───────────────────────────────────────────────
// Each bank declares a set of required patterns that ALL must match,
// plus an optional set of forbidden patterns that must NOT match.
// Add / tighten patterns as you collect more real samples.

interface BankSmsConfig {
  // Human-readable name for error messages
  bankLabel: string;
  // Every pattern in this list must match the SMS text
  required: RegExp[];
  // If any pattern here matches, the SMS is rejected (anti-spoofing)
  forbidden?: RegExp[];
  anyOf?: RegExp[][];
}

const SMS_CONFIGS: Partial<Record<PaymentMethod, BankSmsConfig>> = {
  // ── CBE ───────────────────────────────────────────────────────────────────
  // Sample: "Dear Ephrem, You have transfered ETB 470.00 to Mrs Yimenashu
  //          on 20/03/2026 at 15:47:19 from your account 1*********2366.
  //          Your account has been debited ... Your Current Balance is ETB
  //          13,353.75. Thank you for Banking with CBE!
  //          https://apps.cbe.com.et:100/?id=FT260790RGK518872366"
  [PaymentMethod.CBE]: {
  bankLabel: 'CBE',
  required: [],

  anyOf: [
    // Format A: Old web transfer SMS (apps.cbe.com.et)
    [
      /you have transfer(?:r?ed)\s+ETB\s+[\d,]+\.?\d*/i,
      /your account has been debited/i,
      /thank you for banking with CBE/i,
      /h(?:tt|it)ps?:\/\/\s*apps\.cbe\.com\.et[^\s]*[\s?&]*id\s*=\s*FT[A-Z0-9]+/i,
    ],

    // Format B: New CBE mobile receipt SMS (mbreciept.cbe.com.et)
    [
      /you have successfully transferred\s+ETB\s+[\d,]+\.?\d*/i,
      /thanks for banking with CBE/i,
      /https?:\/\/[Mm]breciept\.cbe\.com\.et\/FT[A-Z0-9]+-\d+/i,
    ],

    // Format C: CBE mobile app debit notification
    [
      /ETB\s+[\d,]+\.?\d*\s+debited from/i,
      /transaction\s+ID\s*:\s*FT[A-Z0-9]+/i,
      /Total Amount Debited\s+ETB\s+[\d,]+\.?\d*/i,
      /Commercial Bank of Ethiopia/i,
    ],
  ],

  forbidden: [/thank you for using telebirr/i, /ethio telecom/i],
},

  // ── TELEBIRR ──────────────────────────────────────────────────────────────
  // Sample: "Dear Ephrem You have transferred ETB 50.00 to CHALTU HIRPHASA
  //          (2519****7857) on 20/03/2026 20:59:48. Your transaction number
  //          is DCK82EGB8C. ... Your current E-Money Account balance is ETB
  //          0.00. ... https://transactioninfo.ethiotelecom.et/receipt/DCK82EGB8C
  //          Thank you for using telebirr  Ethio telecom"
  [PaymentMethod.TELEBIRR]: {
    bankLabel: 'Telebirr',

    required: [
      /you have transferred\s+ETB\s+[\d,]+\.?\d*/i,
      /your transaction number is\s+[A-Z0-9]{8,12}/i,
      /thank you for using telebirr/i,
      // tolerates spaces, brackets, newlines injected by OCR into the URL
      /https:\/\/\s*transactioninfo\.ethiotelecom\.et[\s/\\[\]]+receipt[\s/\\[\]]+[A-Z0-9]{8,12}/i,
    ],

    anyOf: [
      // Format A: classic Telebirr SMS (with OCR-tolerant URL pattern)
      [
        /you have transferred\s+ETB\s+[\d,]+\.?\d*/i,
        /your transaction number is\s+[A-Z0-9]{8,12}/i,
        /thank you for using telebirr/i,
        /https:\/\/\s*transactioninfo\.ethiotelecom\.et[\s/\\[\]]+receipt[\s/\\[\]]+[A-Z0-9]{8,12}/i,
      ],
      // Format B: Ethio Telecom app share SMS
      [
        /Transaction\s+Number\s*:\s*[A-Z0-9]{8,12}/i,
        /Transaction\s+Time\s*:\s*\d{4}\/\d{2}\/\d{2}/i,
        /Transaction\s+Type\s*:\s*Transfer\s+Money/i,
        /Successful/i,
      ],
    ],

    forbidden: [/thank you for banking with CBE/i, /apps\.cbe\.com\.et/i],
  },

  // ── ABYSSINIA ─────────────────────────────────────────────────────────────
  // TODO: Add real SMS sample to tighten these patterns.
  // Placeholder patterns — will block obviously wrong messages but are not
  // tight enough for production. Replace once you have a real sample.
  [PaymentMethod.ABYSSINIA]: {
    bankLabel: 'Bank of Abyssinia',
    required: [/ETB\s+[\d,]+\.?\d*/i, /bank of abyssinia|abyssinia bank/i],
  },

  // ── EBIRR ─────────────────────────────────────────────────────────────────

  [PaymentMethod.EBIRR]: {
    bankLabel: 'E-Birr',
    required: [
      // E-Birr header tag — unique to their SMS format
      /\[-EBIRR-KAAFI-\]/i,
      // Numeric-only Transfer ID
      /Transfer-Id:\s*\d{10,}/i,
      // Transfer confirmation with amount
      /you have successfully transferred\s+ETB[\d,]+\.?\d*/i,
      // Charges line — always present in E-Birr SMS
      /Charges:\s*ETB[\d,]+\.?\d*\s+with VAT:\s*ETB[\d,]+\.?\d*/i,
      // E-Birr receipt link containing the same Transfer-Id
      /https:\/\/transactioninfo\.ebirr\.com\/kaafimf-Ebirr\/receipt\/\d{10,}/i,
    ],
    forbidden: [
      /thank you for banking with CBE/i,
      /apps\.cbe\.com\.et/i,
      /thank you for using telebirr/i,
      /ethiotelecom\.et/i,
      /abyssinia/i,
    ],
  },

  // ── NIB ───────────────────────────────────────────────────────────────────
  // TODO: Add real SMS sample.
  [PaymentMethod.NIB]: {
    bankLabel: 'NIB International Bank',
    required: [/ETB\s+[\d,]+\.?\d*/i, /NIB|nib international/i],
  },
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SmsPreValidatorService {
  // ── Main entry point ──────────────────────────────────────────────────────
  // Call this BEFORE verifyService.verify() / extractBulkReceipt().
  // Returns immediately with valid=false if the text doesn't look right,
  // saving a full pipeline call.

  validate(
    rawText: string,
    paymentMethod: PaymentMethod,
    verMethod: VerificationMethod,
  ): PreValidationResult {
    if (verMethod !== VerificationMethod.SMS) {
      return { valid: true };
    }

    const trimmed = rawText.trim();
    if (trimmed.length < 80) {
      return {
        valid: false,
        reason:
          `❌ That message is too short to be a bank SMS.\n\n` +
          `Please forward the full SMS you received from your bank, not just part of it.`,
      };
    }

    const config = SMS_CONFIGS[paymentMethod];
    if (!config) {
      return { valid: true };
    }

    // ── Check forbidden patterns first ────────────────────────────────────────
    if (config.forbidden) {
      for (const pattern of config.forbidden) {
        if (pattern.test(trimmed)) {
          return {
            valid: false,
            reason:
              `❌ This SMS appears to be from a different bank.\n\n` +
              `You selected *${config.bankLabel}* as your payment method. ` +
              `Please forward the SMS from ${config.bankLabel} specifically.`,
          };
        }
      }
    }

    // ── anyOf: pass if ALL patterns in at least ONE group match ───────────────
    if (config.anyOf?.length) {
      const anyGroupPasses = config.anyOf.some((group) =>
        group.every((pattern) => pattern.test(trimmed)),
      );
      if (anyGroupPasses) return { valid: true };
    }

    // ── required: ALL patterns must match (original format fallback) ──────────
    if (config.required?.length) {
      for (const pattern of config.required) {
        if (!pattern.test(trimmed)) {
          return {
            valid: false,
            reason:
              `❌ This doesn't look like a valid ${config.bankLabel} SMS.\n\n` +
              `Please make sure you're forwarding the exact SMS you received from ${config.bankLabel} — ` +
              `not a screenshot description, not a partial message.`,
          };
        }
      }
    }

    return { valid: true };
  }
}
