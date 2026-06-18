import { deleteItemMethod, queryTableMethod } from "@onmoapp/onmo-dynamodb";
import { noExclusiveScope } from "@libs/scopes";
import { getLogger, logger } from "@libs/logger";
import { asyncSafeExec, LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";
import { toLMSResult } from "@libs/utils";
import {
  Scopes,
  TransactionRecord,
  TransactionRequestSchema,
  TransactionsListRequestSchema,
  TransactionsServiceInterface,
} from "./interface";
import { Logger } from "@onmoapp/onmo-logger";
import { AUTH_TRANSACTIONS_TABLE } from "@libs/constants";

export class TransactionsService extends TransactionsServiceInterface {
  log: Logger;
  constructor(log: Logger = getLogger()) {
    super();
    this.log = log;
  }

  async deleteByDeviceId(id: string): Promise<LMSResult<void>> {
    const transRes = await this.transactionListByDeviceId(id);
    if (!transRes.ok) return transRes;

    for (const it of transRes.data) {
      const delRes = await this.delete(it.transaction_id);
      if (!delRes.ok) return delRes;
    }

    return LMSSuccess();
  }

  async delete(id: string): Promise<LMSResult<void>> {
    const deleteRes = await asyncSafeExec(deleteItemMethod)({
      TableName: AUTH_TRANSACTIONS_TABLE,
      Key: { transaction_id: id },
    });

    return deleteRes.ok ? LMSSuccess() : deleteRes;
  }

  async deleteByOnmoId(id: string, scopes: Scopes): Promise<LMSResult<void>> {
    const recordsRes = await this.transactionListByOnmoId(id);
    if (!recordsRes.ok) return recordsRes;

    if (recordsRes.data.length === 0) {
      this.log.info(`No existing transactions found for onmouuid: ${id}`);
      return LMSSuccess();
    }

    let deleteCount = 0;

    for (const record of recordsRes.data) {
      const { scope: transactionScope } = record;

      for (const scope of scopes) {
        const isAllowed = noExclusiveScope({
          existingScopes:
            typeof transactionScope === "string"
              ? (transactionScope?.split(",") ?? [])
              : (transactionScope ?? []),
          ...scope,
        });
        if (!isAllowed) {
          this.log.info(
            `Transaction has incompatible scopes to request, deleting: ${record.transaction_id}`,
          );
          const deleteRes = await this.delete(record.transaction_id);
          if (!deleteRes.ok) return deleteRes;
          deleteCount++;
        }
      }
    }
    logger.info(
      `Deleted ${deleteCount}/${recordsRes.data.length} existing transactions for onmouuid: ${id}`,
    );

    return LMSSuccess();
  }

  async transaction(id: string): Promise<LMSResult<TransactionRecord>> {
    const query = await asyncSafeExec(queryTableMethod)({
      TableName: AUTH_TRANSACTIONS_TABLE,
      KeyConditionExpression: "transaction_id = :transaction_id",
      ExpressionAttributeValues: { ":transaction_id": id },
    });

    if (!query.ok) return query;

    if (query.data.Count === 0) {
      this.log.warn("transaction service: transaction not found for id:${id}");
      return LMSFailure({
        type: "NOT_FOUND_ERROR",
        message: `transaction not found`,
      });
    }

    const transactionRecord = TransactionRequestSchema.safeParse(query.data);

    return toLMSResult(transactionRecord, "transaction service: transaction parsing");
  }

  async transactionListByDeviceId(id: string): Promise<LMSResult<TransactionRecord[]>> {
    const query = await asyncSafeExec(queryTableMethod)({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "dev-index",
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": id },
      ProjectionExpression: "transaction_id",
    });

    if (!query.ok) return query;

    const transactionsRes = TransactionsListRequestSchema.safeParse(query.data);

    return toLMSResult(transactionsRes, "transactionListByDeviceId");
  }

  async transactionListByOnmoId(id: string): Promise<LMSResult<TransactionRecord[]>> {
    const query = await asyncSafeExec(queryTableMethod)({
      TableName: AUTH_TRANSACTIONS_TABLE,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": id },
      ExpressionAttributeNames: { "#scope": "scope" },
      ProjectionExpression: "transaction_id, #scope",
    });

    if (!query.ok) {
      this.log.warn("transaction service: failed to get dyanmo records");
      return query;
    }

    const transactionsRes = TransactionsListRequestSchema.safeParse(query.data);

    return toLMSResult(transactionsRes, "transactionListByOnmoId");
  }
}
