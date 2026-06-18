import { LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";

import { getLogger } from "@libs/logger";
import { QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { toLMSResult } from "@libs/utils";
import { Logger } from "@onmoapp/onmo-logger";
import { userTableResponseSchema, User, UserRecords } from "@services/user/interface";

export function toUserRecords(
  result: LMSResult<QueryCommandOutput>,
  log: Logger = getLogger(),
): LMSResult<UserRecords> {
  if (!result.ok) {
    log.error(result.error);
    return result;
  }

  if (result.data.Count === 0) {
    log.warn("No user record found");
    return LMSFailure({
      type: "NOT_FOUND_ERROR",
      message: "no user record found for query",
    });
  }

  const user = userTableResponseSchema.safeParse(result.data);

  if (!user.success) {
    log.error(user.error);
  }
  return toLMSResult(user);
}

export function toUserRecord(
  result: LMSResult<QueryCommandOutput>,
  log: Logger = getLogger(),
): LMSResult<User> {
  const records = toUserRecords(result);
  if (!records.ok) return records;

  if (records.data.length > 1) {
    const msg = "multiple records found for query";
    log.error(msg);
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: msg,
    });
  }

  return LMSSuccess(records.data[0]);
}
