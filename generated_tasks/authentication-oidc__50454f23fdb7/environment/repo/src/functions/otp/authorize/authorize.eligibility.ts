import { queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { APR_INCREASES_TABLE } from "@libs/config";

export const isEligibleForAprScope = async (onmouuid: string) => {
  try {
    const res = await queryTableMethod({
      TableName: APR_INCREASES_TABLE,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    if (!res.Count) {
      throw new Error(
        `No record in ${APR_INCREASES_TABLE} found for onmouuid ${onmouuid}, not eligible to authorize for apr scope`,
      );
    }
  } catch (error: any) {
    throw new Error(
      `Error querying ${APR_INCREASES_TABLE} for onmouuid ${onmouuid}: ${error.message || error}`,
    );
  }
};
