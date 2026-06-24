import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { asyncSafeExec, LMSResult } from "@onmoapp/core-banking";
import { User, UserRecords, UserRecordsServiceInterface } from "@services/user/interface";
import { toUserRecord, toUserRecords } from "@services/user/utils";
import { USER_TABLE } from "@libs/config";

export class UserRecordsService extends UserRecordsServiceInterface {
  constructor() {
    super();
  }

  async byDeviceId(id: string): Promise<LMSResult<User>> {
    const queryUserTableRes = await asyncSafeExec(queryTableMethod)({
      TableName: USER_TABLE,
      IndexName: "dev-index",
      KeyConditionExpression: "dev = :device_id",
      ExpressionAttributeValues: { ":device_id": id },
    });

    return toUserRecord(queryUserTableRes);
  }

  async byId(id: string): Promise<LMSResult<User>> {
    const queryUserTableRes = await asyncSafeExec(queryTableMethod)({
      TableName: USER_TABLE,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": id },
    });
    return toUserRecord(queryUserTableRes);
  }

  async byPhoneNumber(num: string): Promise<LMSResult<UserRecords>> {
    const queryUserTableRes = await asyncSafeExec(queryTableMethod)({
      TableName: USER_TABLE,
      IndexName: "phonenumber-index",
      KeyConditionExpression: "phonenumber = :phonenumber",
      ExpressionAttributeValues: { ":phonenumber": num },
    });

    return toUserRecords(queryUserTableRes);
  }

  static init() {
    return new UserRecordsService();
  }
}
