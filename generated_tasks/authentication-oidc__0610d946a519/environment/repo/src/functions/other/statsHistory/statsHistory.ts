import { Logger, LogLevel } from "@onmoapp/onmo-logger";
import { scanTableMethod } from "@onmoapp/onmo-dynamodb";
import { getParameter } from "@onmoapp/onmo-ssm";
import { formatHTMLResponse } from "@libs/gatewayUtils";

const env = process.env.ENVIRONMENT as string;
const auth_hashes_table = process.env.AUTH_HASHES_TABLE as string;
const staff_onmouuids_param = process.env.STAFF_ONMOUUIDS_PARAM as string;

export const handler = async (_event: any) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  try {
    let allRecords: Record<string, any>[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    const { Parameter } = await getParameter({ Name: staff_onmouuids_param });
    if (!Parameter?.Value) {
      throw new Error(`Failed to fetch staff onmouuids parameter from ssm`);
    }

    const staffOnmouuids = JSON.parse(Parameter.Value) as string[];
    const staffOnmouuidsSet = new Set(staffOnmouuids);

    do {
      const scanResult = await scanTableMethod({
        TableName: auth_hashes_table,
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 500,
      });
      if (scanResult.Items && scanResult.Items.length > 0) {
        allRecords = [...allRecords, ...scanResult.Items];
      }
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const nonStaffRecords = allRecords
      .filter((item) => !staffOnmouuidsSet.has(item?.onmouuid))
      .map((item) => ({
        onmouuid: item.onmouuid,
        first_login: item.created || "2025-02-03T18:24:25.899Z",
      }));

    const rows = nonStaffRecords
      .sort((a, b) => new Date(b.first_login).getTime() - new Date(a.first_login).getTime())
      .map((r) => "<tr><td><code>" + r.onmouuid + "</code></td><td>" + r.first_login + "</td></tr>")
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
      "<h1>Cumulative New App Users: " +
      nonStaffRecords.length +
      "</h1>" +
      "<table><tr><th>Onmouuid</th><th>First Login</th></tr>" +
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
