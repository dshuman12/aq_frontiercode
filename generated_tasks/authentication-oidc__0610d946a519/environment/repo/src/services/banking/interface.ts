import { LMSResult } from "@onmoapp/core-banking";
import { AccountDetails } from "@onmoapp/onmo-types";
import { z } from "zod";
import { CardSummary } from "@services/card/interface";
import { parseISO } from "date-fns";

export abstract class BankingServiceInterface {
  abstract creditAccountSummary(): Promise<LMSResult<CreditAccountSummary>>;
  abstract customerSummary(): Promise<LMSResult<CustomerSummary>>;
  abstract cardSummary(): Promise<LMSResult<CardSummary>>;
  abstract getId(): string;
}

export const creditAccountSummarySchema = z.object({
  id: z.string(),
  state: z.string<AccountDetails["state"]>(),
  createdAt: z.iso.datetime().transform((it) => it && parseISO(it)),
});

export type CreditAccountSummary = z.infer<typeof creditAccountSummarySchema>;

const genericContact = z.object({
  primary: z.string(),
});

export const UserIdMapSchema = z.object({
  mambuId: z.string("UserIdMap: mambuId not set").optional(),
  creditAccountId: z.string().optional(),
});

export type UserIdMap = z.infer<typeof UserIdMapSchema>;

export const customerSchema = z
  .object({
    customerId: z.string(),
    mobileNumbers: genericContact,
    emailAddresses: genericContact,
    firstName: z.string(),
    lastName: z.string(),
    creationDate: z.string().transform((it) => parseISO(it)),
  })
  .transform((c) => ({
    id: c.customerId,
    mobile: c.mobileNumbers.primary,
    email: c.emailAddresses.primary,
    firstName: c.firstName,
    lastName: c.lastName,
    createdAt: c.creationDate,
  }));

export type CustomerSummary = {
  id: string;
  mobile: string;
  email: string;
  firstName: string;
  lastName: string;
  updatedAt: Date;
};
