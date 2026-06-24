import { PaymentMethod, VerificationMethod } from 'src/common/types/bot-enum';
import { VerificationStage } from './validators/type';

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

export abstract class VerificationError extends Error {
  abstract readonly userMessage: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtractionError
//
// Thrown by GenericValidation.verify() when the entire extraction process
// fails — i.e. none of the parsers could produce a usable receipt.
// ─────────────────────────────────────────────────────────────────────────────

export class ExtractionError extends VerificationError {
  readonly userMessage =
    `We could not read your receipt. ` +
    `Please make sure it is clear and complete, then try again.`;

  constructor(
    public readonly bank: PaymentMethod,
    public readonly method: VerificationMethod,
    public readonly stage: VerificationStage,
    cause?: unknown,
  ) {
    super(
      `Extraction failed — bank: ${bank}, method: ${method}, stage: ${stage}`,
      { cause },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ParseError
//
// Thrown inside GenericValidation.validateSwitcher() when a specific
// parser (CBE, Telebirr, OCR, SMS…) throws an unexpected error.
// ─────────────────────────────────────────────────────────────────────────────

export class ParseError extends VerificationError {
  readonly userMessage =
    `We had trouble processing your receipt with the selected bank. ` +
    `Please try again or use a different verification method.`;

  constructor(
    public readonly bank: PaymentMethod,
    public readonly method: VerificationMethod,
    public readonly stage: VerificationStage,
    cause?: unknown,
  ) {
    super(`Parser failed — bank: ${bank}, method: ${method}, stage: ${stage}`, {
      cause,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UnsupportedMethodError
//
// Thrown when an unrecognised VerificationMethod is passed to the switcher.
// Should never happen in production but guards against bad enum values.
// ─────────────────────────────────────────────────────────────────────────────

export class UnsupportedMethodError extends VerificationError {
  readonly userMessage =
    `The verification method you selected is not supported. ` +
    `Please go back and choose a valid option.`;

  constructor(
    public readonly method: string,
    public readonly stage: VerificationStage,
  ) {
    super(
      `Unsupported verification method — method: ${method}, stage: ${stage}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineStageError
//
// Thrown when one of the 4 validation pipes (duplicate, amount, receiver,
// timestamp) throws an unexpected error — as opposed to simply returning
// a failing PipeResult, which is the normal failure path.
// ─────────────────────────────────────────────────────────────────────────────

export class PipelineStageError extends VerificationError {
  readonly userMessage =
    `We encountered an issue while verifying your payment details. ` +
    `Please try again. If the problem persists, contact support.`;

  constructor(
    public readonly stage: VerificationStage,
    cause?: unknown,
  ) {
    super(`Pipeline stage threw unexpectedly — stage: ${stage}`, { cause });
  }
}
