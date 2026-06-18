import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryTableMethod, deleteItemMethod } from "@onmoapp/onmo-dynamodb";
import { noExclusiveScope } from "@libs/scopes";
import { deleteCurrentTransactions, deleteIncompatibleTransactions } from "./delete-transactions";
import { logger } from "@onmoapp/logger";

vi.mock("@onmoapp/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    addContext: vi.fn(),
  },
}));

// Mock the dependencies
vi.mock("@onmoapp/onmo-dynamodb", () => ({
  queryTableMethod: vi.fn(),
  deleteItemMethod: vi.fn(),
}));

vi.mock("@libs/scopes", () => ({
  noExclusiveScope: vi.fn(),
}));

describe("deleteCurrentTransactions", () => {
  const device_id = "test-device-id";
  const auth_transactions_table = "test-auth-transactions-table";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete all transactions when transactions exist", async () => {
    const mockTransactions = [
      { transaction_id: "txn-1" },
      { transaction_id: "txn-2" },
      { transaction_id: "txn-3" },
    ];

    (queryTableMethod as any).mockResolvedValue({
      Items: mockTransactions,
      Count: 3,
    });

    (deleteItemMethod as any).mockResolvedValue({});

    await deleteCurrentTransactions({
      device_id,
      auth_transactions_table,
    });

    expect(queryTableMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      IndexName: "dev-index",
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": device_id },
      ProjectionExpression: "transaction_id",
    });

    expect(deleteItemMethod).toHaveBeenCalledTimes(3);
    expect(deleteItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id: "txn-1" },
    });
    expect(deleteItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id: "txn-2" },
    });
    expect(deleteItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id: "txn-3" },
    });

    expect(logger.info).toHaveBeenCalledWith(
      "3 existing transactions for device_id, deleting them",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Successfully deleted existing transactions for device_id",
    );
  });

  it("should not delete anything when no transactions exist", async () => {
    (queryTableMethod as any).mockResolvedValue({
      Items: [],
      Count: 0,
    });

    await deleteCurrentTransactions({
      device_id,
      auth_transactions_table,
    });

    expect(queryTableMethod).toHaveBeenCalled();
    expect(deleteItemMethod).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("No existing transactions found for device_id");
  });

  it("should handle undefined Items gracefully", async () => {
    (queryTableMethod as any).mockResolvedValue({
      Items: undefined,
      Count: 0,
    });

    await deleteCurrentTransactions({
      device_id,
      auth_transactions_table,
    });

    expect(deleteItemMethod).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("No existing transactions found for device_id");
  });

  it("should throw error when queryTableMethod fails", async () => {
    const mockError = new Error("Database error");
    (queryTableMethod as any).mockRejectedValue(mockError);

    await expect(
      deleteCurrentTransactions({
        device_id,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Database error");
  });

  it("should throw error when deleteItemMethod fails", async () => {
    const mockTransactions = [{ transaction_id: "txn-1" }];
    const mockError = new Error("Delete error");

    (queryTableMethod as any).mockResolvedValue({
      Items: mockTransactions,
      Count: 1,
    });
    (deleteItemMethod as any).mockRejectedValue(mockError);

    await expect(
      deleteCurrentTransactions({
        device_id,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Delete error");
  });
});

describe("deleteIncompatibleTransactions", () => {
  const onmouuid = "test-onmouuid";
  const newScopes = ["scope1", "scope2"];
  const exclusiveScopes = ["exclusive-scope"];
  const auth_transactions_table = "test-auth-transactions-table";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete transactions with incompatible scopes", async () => {
    const mockTransactions = [
      { transaction_id: "txn-1", scope: "scope1,scope3" },
      { transaction_id: "txn-2", scope: "scope1,scope2" },
      { transaction_id: "txn-3", scope: "exclusive-scope" },
    ];

    (queryTableMethod as any).mockResolvedValue({
      Items: mockTransactions,
      Count: 3,
    });

    (noExclusiveScope as any)
      .mockReturnValueOnce(false) // txn-1: incompatible
      .mockReturnValueOnce(true) // txn-2: compatible
      .mockReturnValueOnce(false); // txn-3: incompatible

    (deleteItemMethod as any).mockResolvedValue({});

    await deleteIncompatibleTransactions({
      onmouuid,
      newScopes,
      exclusiveScopes,
      auth_transactions_table,
    });

    expect(queryTableMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      IndexName: "onmouuid-index",
      KeyConditionExpression: "onmouuid = :onmouuid",
      ExpressionAttributeValues: { ":onmouuid": onmouuid },
      ExpressionAttributeNames: { "#scope": "scope" },
      ProjectionExpression: "transaction_id, #scope",
    });

    expect(noExclusiveScope).toHaveBeenCalledTimes(3);
    expect(noExclusiveScope).toHaveBeenCalledWith({
      newScopes,
      existingScopes: ["scope1", "scope3"],
      exclusiveScopes,
    });
    expect(noExclusiveScope).toHaveBeenCalledWith({
      newScopes,
      existingScopes: ["scope1", "scope2"],
      exclusiveScopes,
    });
    expect(noExclusiveScope).toHaveBeenCalledWith({
      newScopes,
      existingScopes: ["exclusive-scope"],
      exclusiveScopes,
    });

    expect(deleteItemMethod).toHaveBeenCalledTimes(2);
    expect(deleteItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id: "txn-1" },
    });
    expect(deleteItemMethod).toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id: "txn-3" },
    });
    expect(deleteItemMethod).not.toHaveBeenCalledWith({
      TableName: auth_transactions_table,
      Key: { transaction_id: "txn-2" },
    });

    expect(logger.info).toHaveBeenCalledWith(
      "3 existing transactions for onmouuid, comparing scopes",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Transaction has incompatible scopes to request, deleting",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Successfully deleted 2 existing transactions for onmouuid",
    );
  });

  it("should skip transactions without scope", async () => {
    const mockTransactions = [
      { transaction_id: "txn-1", scope: "scope1" },
      { transaction_id: "txn-2" }, // no scope
      { transaction_id: "txn-3", scope: "scope2" },
    ];

    (queryTableMethod as any).mockResolvedValue({
      Items: mockTransactions,
      Count: 3,
    });

    (noExclusiveScope as any)
      .mockReturnValueOnce(false) // txn-1: incompatible
      .mockReturnValueOnce(false); // txn-3: incompatible

    (deleteItemMethod as any).mockResolvedValue({});

    await deleteIncompatibleTransactions({
      onmouuid,
      newScopes,
      exclusiveScopes,
      auth_transactions_table,
    });

    expect(logger.error).toHaveBeenCalledWith("Transaction does not have scope");
    expect(noExclusiveScope).toHaveBeenCalledTimes(2); // Only called for txn-1 and txn-3
    expect(deleteItemMethod).toHaveBeenCalledTimes(2); // Only deletes txn-1 and txn-3
  });

  it("should not delete anything when no transactions exist", async () => {
    (queryTableMethod as any).mockResolvedValue({
      Items: [],
      Count: 0,
    });

    await deleteIncompatibleTransactions({
      onmouuid,
      newScopes,
      exclusiveScopes,
      auth_transactions_table,
    });

    expect(queryTableMethod).toHaveBeenCalled();
    expect(deleteItemMethod).not.toHaveBeenCalled();
    expect(noExclusiveScope).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("No existing transactions found for onmouuid");
  });

  it("should not delete anything when all transactions have compatible scopes", async () => {
    const mockTransactions = [
      { transaction_id: "txn-1", scope: "scope1,scope2" },
      { transaction_id: "txn-2", scope: "scope1" },
    ];

    (queryTableMethod as any).mockResolvedValue({
      Items: mockTransactions,
      Count: 2,
    });

    (noExclusiveScope as any).mockReturnValue(true); // All compatible

    await deleteIncompatibleTransactions({
      onmouuid,
      newScopes,
      exclusiveScopes,
      auth_transactions_table,
    });

    expect(deleteItemMethod).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "Successfully deleted 0 existing transactions for onmouuid",
    );
  });

  it("should throw error when queryTableMethod fails", async () => {
    const mockError = new Error("Database error");
    (queryTableMethod as any).mockRejectedValue(mockError);

    await expect(
      deleteIncompatibleTransactions({
        onmouuid,
        newScopes,
        exclusiveScopes,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Database error");
  });

  it("should throw error when deleteItemMethod fails", async () => {
    const mockTransactions = [{ transaction_id: "txn-1", scope: "scope1" }];
    const mockError = new Error("Delete error");

    (queryTableMethod as any).mockResolvedValue({
      Items: mockTransactions,
      Count: 1,
    });
    (noExclusiveScope as any).mockReturnValue(false);
    (deleteItemMethod as any).mockRejectedValue(mockError);

    await expect(
      deleteIncompatibleTransactions({
        onmouuid,
        newScopes,
        exclusiveScopes,
        auth_transactions_table,
      }),
    ).rejects.toThrow("Delete error");
  });
});
