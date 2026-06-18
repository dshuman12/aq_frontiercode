import { scanTableMethod } from "@onmoapp/onmo-dynamodb";
import { logger } from "@onmoapp/logger";
import { getParameter } from "@onmoapp/onmo-ssm";
import { formatHTMLResponse } from "@libs/gatewayUtils";
import { hasRecordExpired, getCurrentTimestampInSeconds } from "@libs/utils";
import { AUTH_TOKENS_TABLE, STAFF_ONMOUUIDS_PARAM } from "@libs/config";

export const handler = async (_event: any) => {
  try {
    let allRecords: Record<string, any>[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    const { Parameter } = await getParameter({ Name: STAFF_ONMOUUIDS_PARAM });
    if (!Parameter?.Value) {
      throw new Error(`Failed to fetch staff onmouuids parameter from ssm`);
    }

    const staffOnmouuids = JSON.parse(Parameter.Value) as string[];
    const staffOnmouuidsSet = new Set(staffOnmouuids);

    do {
      const scanResult = await scanTableMethod({
        TableName: AUTH_TOKENS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 500,
      });
      if (scanResult.Items && scanResult.Items.length > 0) {
        allRecords = [...allRecords, ...scanResult.Items];
      }
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const currentTime = getCurrentTimestampInSeconds();
    const nonStaffRecords = allRecords
      .filter(
        (item) =>
          !staffOnmouuidsSet.has(item?.onmouuid) &&
          item.domain === "app" &&
          !hasRecordExpired(item.ttl),
      )
      .map((item) => ({
        onmouuid: item.onmouuid,
        remaining_minutes: Math.floor((item.ttl - currentTime) / 60),
      }));

    const rows = nonStaffRecords
      .map(
        (r) =>
          "<tr><td><code>" + r.onmouuid + "</code></td><td>" + r.remaining_minutes + "</td></tr>",
      )
      .join("");

    const html =
      "<!DOCTYPE html><html><head><title>Active Users</title>" +
      "<style>" +
      "body { font-family: -apple-system, sans-serif; padding: 20px; }" +
      "table { border-collapse: collapse; }" +
      "td, th { padding: 8px; border: 1px solid #ddd; }" +
      "code { font-family: monospace; }" +
      "</style>" +
      "</head><body>" +
      "<h1>Users Logged In Now: " +
      nonStaffRecords.length +
      "</h1>" +
      "<table><tr><th>Onmouuid</th><th>Token Expiry Minutes</th></tr>" +
      rows +
      "</table>" +
      "</body></html>";

    return formatHTMLResponse({ statusCode: 200, body: html });
  } catch (error: any) {
    logger.warn(`Something went wrong: ${error?.message || error}`);
    return formatHTMLResponse({
      statusCode: 500,
      body: "<!DOCTYPE html><html><body><h1>Something went wrong</h1></body></html>",
    });
  }
};
