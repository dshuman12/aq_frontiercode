export type TransactionRecord = {
  code_challenge?: string;
  scope?: string;
  auth_code?: string;
  otp_sms_verified?: boolean;
  verify_code?: number;
};
