import { LMSResult } from "@onmoapp/core-banking";
import { z } from "zod";

export abstract class UserRecordsServiceInterface {
  abstract byId(id: string): Promise<LMSResult<User>>;
  abstract byDeviceId(id: string): Promise<LMSResult<User>>;
  abstract byPhoneNumber(num: string): Promise<LMSResult<UserRecords>>;
}

const tableItem = z.object({
  dev: z.string().optional(),
  mambuCreditCardAccountID: z.string().optional(),
  mambuID: z.string().optional(),
  onmouuid: z.string(),
  onboarded_status: z.string().optional(),
  phonenumber: z.string().optional(),
});

export const userTableResponseSchema = z
  .object({
    Items: z.array(tableItem, "UserService: items not found on table"),
  })
  .transform((datum) => {
    return datum.Items.map((item) => ({
      creditAccountId: item.mambuCreditCardAccountID,
      mambuId: item.mambuID,
      deviceId: item.dev,
      id: item.onmouuid,
      onboardedStatus: item.onboarded_status,
      mobile: item.phonenumber,
    }));
  });

export type UserRecords = z.infer<typeof userTableResponseSchema>;
export type User = UserRecords[number];
