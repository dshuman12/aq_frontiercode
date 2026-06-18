import { LMSResult } from "@onmoapp/core-banking";
import { CardSummary, tableToCardSummarySchema } from "@services/card/interface";
import { toLMSResult } from "@libs/utils";
import { CustomQueryCommandOutput } from "@onmoapp/onmo-dynamodb/lib/esm/types/types/types";

export function toCardDetail(
  tableResult: LMSResult<CustomQueryCommandOutput>,
): LMSResult<CardSummary> {
  if (!tableResult.ok) return tableResult;

  const cardItem = tableResult.data.Items[0];

  const table = tableToCardSummarySchema.safeParse(cardItem);

  return toLMSResult(table, "toCardDetail: parse error");
}
