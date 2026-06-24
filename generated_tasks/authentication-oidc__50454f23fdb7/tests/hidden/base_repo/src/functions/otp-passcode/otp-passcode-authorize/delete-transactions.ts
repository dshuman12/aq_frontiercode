import { queryTableMethod, deleteItemMethod } from "@onmoapp/onmo-dynamodb";
import { noExclusiveScope } from "@libs/scopes";
import { logger } from "@onmoapp/logger";

type DeleteCurrentTransactionsParams = {
  device_id: string;
  auth_transactions_table: string;
};

export async function deleteCurrentTransactions({
  device_id,
  auth_transactions_table,
}: DeleteCurrentTransactionsParams): Promise<void> {
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    IndexName: "dev-index",
    KeyConditionExpression: "device_id = :device_id",
    ExpressionAttributeValues: { ":device_id": device_id },
    ProjectionExpression: "transaction_id",
  });
  if (queryTransactionsTableRes?.Items?.length) {
    logger.info(
      `${queryTransactionsTableRes.Count} existing transactions for device_id, deleting them`,
    );

    for (const transaction of queryTransactionsTableRes.Items) {
      const { transaction_id } = transaction;
      await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
    }
    logger.info(`Successfully deleted existing transactions for device_id`);
  } else {
    logger.info(`No existing transactions found for device_id`);
  }
}

type DeleteIncompatibleTransactionsParams = {
  onmouuid: string;
  newScopes: string[];
  exclusiveScopes: string[];
  auth_transactions_table: string;
};

export async function deleteIncompatibleTransactions({
  onmouuid,
  newScopes,
  exclusiveScopes,
  auth_transactions_table,
}: DeleteIncompatibleTransactionsParams): Promise<void> {
  const queryTransactionsTableRes = await queryTableMethod({
    TableName: auth_transactions_table,
    IndexName: "onmouuid-index",
    KeyConditionExpression: "onmouuid = :onmouuid",
    ExpressionAttributeValues: { ":onmouuid": onmouuid },
    ExpressionAttributeNames: { "#scope": "scope" },
    ProjectionExpression: "transaction_id, #scope",
  });
  if (queryTransactionsTableRes?.Items?.length) {
    logger.info(
      `${queryTransactionsTableRes.Count} existing transactions for onmouuid, comparing scopes`,
    );
    let transactionDeleteCount = 0;

    for (const transaction of queryTransactionsTableRes.Items) {
      const { transaction_id, scope: transactionScope } = transaction;

      if (!transactionScope) {
        logger.error("Transaction does not have scope");
        continue;
      }

      const isAllowed = noExclusiveScope({
        newScopes,
        existingScopes: transactionScope.split(","),
        exclusiveScopes,
      });

      if (!isAllowed) {
        logger.info("Transaction has incompatible scopes to request, deleting");
        await deleteItemMethod({ TableName: auth_transactions_table, Key: { transaction_id } });
        transactionDeleteCount += 1;
        logger.info(`Successfully deleted transaction for onmouuid`);
      }
    }
    logger.info(
      `Successfully deleted ${transactionDeleteCount} existing transactions for onmouuid`,
    );
  } else {
    logger.info(`No existing transactions found for onmouuid`);
  }
}
