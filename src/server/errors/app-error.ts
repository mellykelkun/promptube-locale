import "server-only";

import type { ErrorCode } from "@/server/errors/error-codes";

type AppErrorOptions = Readonly<{
  code: ErrorCode;
  context?: Readonly<Record<string, unknown>>;
  publicMessage: string;
  status: number;
}>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly publicMessage: string;
  readonly status: number;

  constructor({ code, context, publicMessage, status }: AppErrorOptions) {
    super(publicMessage);
    this.name = "AppError";
    this.code = code;
    this.context = context;
    this.publicMessage = publicMessage;
    this.status = status;
  }
}
