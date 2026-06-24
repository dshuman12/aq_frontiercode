import { z } from "zod";
import { LMSResult } from "@onmoapp/core-banking";

export abstract class CardServiceInterface {
  abstract cardSummaryByCardId(id: string): Promise<LMSResult<CardSummary>>;
  abstract cardSummary(): Promise<LMSResult<CardSummary>>;
}

export const CustomerToCardTableSchema = z.object({
  cardId: z.string(),
  activationDateTime: z.iso.datetime().optional(),
  cardStatus: z.string().optional(),
  corePaymentsAccountId: z.string(),
  customerId: z.string(),
  updatedAt: z.iso.datetime().optional(),
});

export const tableToCardSummarySchema = CustomerToCardTableSchema.transform(
  ({ cardId, cardStatus, activationDateTime }) => {
    return {
      id: cardId,
      status: cardStatus,
      isActivated: activationDateTime !== undefined,
    };
  },
);

export type CardSummary = z.infer<typeof tableToCardSummarySchema>;
