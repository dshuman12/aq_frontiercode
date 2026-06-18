import { getParameter } from "@onmoapp/onmo-ssm";
import { getObject } from "@onmoapp/onmo-s3";
import { logger, serializeError } from "@onmoapp/logger";
import { ZodSafeParseResult } from "zod";
import { LMSFailure, LMSSuccess } from "@onmoapp/core-banking";

export const getCurrentTimestampInSeconds = () => Math.floor(Date.now() / 1000);

export const hasRecordExpired = (ttl?: number) =>
  typeof ttl === "number" ? ttl < getCurrentTimestampInSeconds() : true;

export const getValueFromStoreByParamName = async (paramName: string) => {
  const { Parameter: parameter } = await getParameter({
    Name: paramName,
  });

  if (!parameter?.Value) {
    throw new Error(`Failed to fetch S3 location from SSM`);
  }

  // The value is an S3 location and is expected to be in the format "bucket-name/key"
  // The actual value is stored in S3 as a JSON file.
  const splitParamValue = parameter.Value.split("/");

  const actualValueFromStore = await getObject({
    Bucket: splitParamValue[0],
    Key: splitParamValue[1],
  });

  if (!actualValueFromStore) {
    throw new Error(`Failed to fetch values from S3 location ${parameter.Value}`);
  }

  return actualValueFromStore;
};

export const getValueFromParamByParamName = async (paramName: string) => {
  const { Parameter: parameter } = await getParameter({
    Name: paramName,
  });
  if (!parameter?.Value) {
    throw new Error(`Failed to fetch ${paramName} from SSM`);
  }

  return parameter.Value;
};

export function toLMSResult<TData>(
  result: ZodSafeParseResult<TData>,
  message: string = "zod parsing error",
) {
  if (!result.success) {
    const err = LMSFailure({
      type: "VALIDATION_ERROR",
      message: message,
      context: result.error.issues,
    });
    logger.error(serializeError(err));
    return err;
  }
  return LMSSuccess(result.data);
}
