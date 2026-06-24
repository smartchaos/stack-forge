import pino from "pino";

export enum LogLevel {
  FATAL = "fatal",
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
  TRACE = "trace",
  SILENT = "silent",
}

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
}

export function createLogger(options: LoggerOptions = {}): pino.Logger {
  const level = options.level || process.env.CFORGE_LOG_LEVEL || LogLevel.INFO;

  return pino({
    level,
    name: options.name || "cforge",
    transport:
      process.env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });
}

export const logger = createLogger();
