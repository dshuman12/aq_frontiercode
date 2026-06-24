import { z } from "zod";
import { LMSResult } from "@onmoapp/core-banking";

export abstract class TransactionsServiceInterface {
  abstract deleteByOnmoId(id: string, scopes: Scopes): Promise<LMSResult<void>>;
  abstract deleteByDeviceId(id: string): Promise<LMSResult<void>>;
  abstract delete(id: string): Promise<LMSResult<void>>;
  abstract transaction(id: string): Promise<LMSResult<TransactionRecord>>;
  abstract transactionListByOnmoId(id: string): Promise<LMSResult<TransactionRecord[]>>;
  abstract transactionListByDeviceId(id: string): Promise<LMSResult<TransactionRecord[]>>;
}

export const TransactionRecordSchema = z.object({
  transaction_id: z.string(),
  auth_code: z.string().optional(),
  auth_flow: z.string().optional(),
  code_challenge: z.string().optional(),
  create_refresh_token: z.boolean().optional(),
  device_id: z.string().optional(),
  login_flow: z.string().optional(),
  extra_scope_flow: z.string().optional(),
  fe_public_key: z.string().optional(),
  new_email: z.string().optional(),
  next_endpoint: z.string().optional(),
  onmouuid: z.string().optional(),
  otp_sms_attempt_count: z.number().optional(),
  otp_sms_expiry_time: z.number().optional(),
  otp_sms_send_count: z.number().optional(),
  otp_sms_verified: z.boolean().optional(),
  passcode_attempt_count: z.number().optional(),
  passcode_verified: z.boolean().optional(),
  phone_number: z.string().optional(),
  scope: z.string().optional(),
  ttl: z.number().optional(),
  verify_code: z.number().optional(),
  unsigned_challenge: z.string().optional(),
  first_name: z.string().optional(),
  biometrics_verified: z.boolean().optional(),
});

export const TransactionsListRequestSchema = z
  .object({
    Items: z.array(TransactionRecordSchema),
  })
  .transform((rec) => rec.Items);

export const TransactionRequestSchema = z
  .object({
    Items: z.array(TransactionRecordSchema).length(1, "transaction not found"),
  })
  .transform((req) => req.Items[0]);

export type TransactionRecord = z.infer<typeof TransactionRecordSchema>;
export type Scopes = { newScopes: string[]; exclusiveScopes: string[] }[];
