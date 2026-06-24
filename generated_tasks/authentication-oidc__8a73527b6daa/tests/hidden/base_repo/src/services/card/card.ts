import { CardSummary, CardServiceInterface } from "@services/card/interface";
import { asyncSafeExec, LMSResult } from "@onmoapp/core-banking";
import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { CUSTOMER_TO_CARD_MAPPING_TABLE } from "@libs/constants";
import { toCardDetail } from "@services/card/utils";

export class CardService implements CardServiceInterface {
  /**
   * @param id - onmo id
   */
  constructor(public id: string) {}

  async cardSummaryByCardId(id: string): Promise<LMSResult<CardSummary>> {
    const queryUserTableRes = await asyncSafeExec(queryTableMethod)({
      TableName: CUSTOMER_TO_CARD_MAPPING_TABLE,
      KeyConditionExpression: "cardId = :cardId",
      ExpressionAttributeValues: { ":cardId": id },
    });

    return toCardDetail(queryUserTableRes);
  }

  async cardSummary(): Promise<LMSResult<CardSummary>> {
    const queryUserTableRes = await asyncSafeExec(queryTableMethod)({
      TableName: CUSTOMER_TO_CARD_MAPPING_TABLE,
      IndexName: "CustomerIdIndex",
      KeyConditionExpression: "customerId = :customerId",
      ExpressionAttributeValues: { ":customerId": this.id },
    });

    return toCardDetail(queryUserTableRes);
  }
}
