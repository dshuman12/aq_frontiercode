import { LogLevel, Logger } from "@onmoapp/onmo-logger";
import { ENV, LOGGING_LEVEL } from "@libs/constants";

export const logger = new Logger(
  {
    env: process.env.STAGE,
  },
  (process.env.LOGGING_LEVEL as LogLevel) || "INFO",
);

export const getLogger = () =>
  new Logger(
    {
      ENV,
    },
    LOGGING_LEVEL,
  );
