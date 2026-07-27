import "server-only";

import { AppError } from "@/server/errors/app-error";
import { redactLogContext, redactLogMessage } from "@/server/security/redact-log-context";

export type LogLevel = "debug" | "error" | "info" | "warn";

type LogDetails = Readonly<{
  context?: Readonly<Record<string, unknown>>;
  correlationId?: string;
  error?: unknown;
}>;

type LogWriter = (level: LogLevel, serializedEntry: string) => void;

type LoggerDependencies = Readonly<{
  now?: () => Date;
  write?: LogWriter;
}>;

function normalizeError(error: unknown): Readonly<Record<string, string>> {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.publicMessage,
      name: error.name,
    };
  }

  if (error instanceof Error) {
    return {
      message: "Unexpected error",
      name: error.name,
    };
  }

  return {
    message: "Unexpected error",
    name: "UnknownError",
  };
}

const defaultWriter: LogWriter = (level, serializedEntry) => {
  const output =
    level === "debug"
      ? console.debug
      : level === "info"
        ? console.info
        : level === "warn"
          ? console.warn
          : console.error;
  output(serializedEntry);
};

export function createLogger({
  now = () => new Date(),
  write = defaultWriter,
}: LoggerDependencies = {}) {
  const log = (level: LogLevel, message: string, details: LogDetails = {}) => {
    const entry = {
      ...(details.context ? { context: redactLogContext(details.context) } : {}),
      ...(details.correlationId ? { correlationId: details.correlationId } : {}),
      ...(details.error ? { error: normalizeError(details.error) } : {}),
      level,
      message: redactLogMessage(message),
      timestamp: now().toISOString(),
    };

    write(level, JSON.stringify(entry));
  };

  return {
    debug: (message: string, details?: LogDetails) => log("debug", message, details),
    error: (message: string, details?: LogDetails) => log("error", message, details),
    info: (message: string, details?: LogDetails) => log("info", message, details),
    warn: (message: string, details?: LogDetails) => log("warn", message, details),
  };
}

export const logger = createLogger();
