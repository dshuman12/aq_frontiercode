import { queryTableMethod } from "@onmoapp/onmo-dynamodb";

const apr_increases_table = process.env.APR_INCREASES_TABLE as string;

export const isEligibleForAprScope = async (onmouuid: string) => {
  try {
    const res = await queryTableMethod({
      TableName: apr_increases_table,
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
    });
    if (!res.Count) {
      throw new Error(
        `No record in ${apr_increases_table} found for onmouuid ${onmouuid}, not eligible to authorize for apr scope`,
      );
    }
  } catch (error: any) {
    throw new Error(
      `Error querying ${apr_increases_table} for onmouuid ${onmouuid}: ${error.message || error}`,
    );
  }
};
