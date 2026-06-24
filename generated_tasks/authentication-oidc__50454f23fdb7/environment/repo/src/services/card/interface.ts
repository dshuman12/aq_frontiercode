import { z } from "zod";
import { LMSResult } from "@onmoapp/core-banking";
import { CardSummary } from "@services/banking/interface";

export abstract class CardServiceInterface {
  abstract getCardDetails(cardId: string): Promise<LMSResult<CardSummary>>;
}

const cardStatusValues = [
  "ACTIVE",
  "PENDING",
  "RETAIN",
  "FREEZE",
  "VERIFY",
  "LOST",
  "STOLEN",
  "EXPIRED",
  "UNFREEZE",
  "LOCK",
  "VOID",
] as const;

export const cardDetailsSchema = z.object({
  cardId: z.string(),
  status: z.enum(cardStatusValues),
  isActivated: z
    .boolean()
    .nullable()
    .transform((v) => !!v),
});
