import { getParameter } from "@onmoapp/onmo-ssm";
import { getObject } from "@onmoapp/onmo-s3";
import { logger } from "./logger";
import { ZodSafeParseResult } from "zod";
import { LMSFailure, LMSSuccess } from "@onmoapp/core-banking";
import { ENV } from "@libs/constants";

export const getCurrentTimestampInSeconds = () => Math.floor(Date.now() / 1000);

export const hasRecordExpired = (ttl?: number) =>
  typeof ttl === "number" ? ttl < getCurrentTimestampInSeconds() : true;

export const getValueFromStoreByParamName = async (paramName: string) => {
  logger.addContext({ paramName, ENV });

  logger.info(`Fetching S3 location from SSM parameter`);
  const { Parameter: parameter } = await getParameter({
    Name: paramName,
  });

  if (!parameter?.Value) {
    throw new Error(`Failed to fetch S3 location from SSM`);
  }

  logger.info(`Fetching values from S3 location ${parameter?.Value}`);

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
  logger.addContext({ paramName, ENV });
  logger.info(`Fetching value from SSM parameter`);
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
    logger.warn(err);
    return err;
  }
  return LMSSuccess(result.data);
}
