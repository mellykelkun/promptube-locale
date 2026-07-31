import "server-only";

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

import { markdownLimits } from "./markdown-contract.ts";
import { markdownErrorCodes, type MarkdownErrorCode } from "./markdown-error-codes.ts";
import {
  buildInvalidMarkdownReport,
  defaultMarkdownReportDependencies,
  type MarkdownReportDependencies,
} from "./markdown-report.ts";
import {
  createEmptyMarkdownMetrics,
  type MarkdownValidationInput,
  type MarkdownValidationResult,
  type MarkdownWorkerInput,
} from "./markdown-types.ts";
import {
  deepFreezeMarkdownValidationResult,
  validateAndRebuildMarkdownWorkerResult,
} from "./markdown-worker-result-validation.ts";

type WorkerFactory = () => Worker;

type MarkdownWorkerClientDependencies = Readonly<{
  createWorker: WorkerFactory;
  reportDependencies: MarkdownReportDependencies;
  timeoutMs: number;
  semaphore?: MarkdownWorkerSemaphore;
}>;

type MarkdownQueueWaiter = Readonly<{
  grant: () => void;
  reject: (error: Error) => void;
}>;

export class MarkdownWorkerSemaphore {
  private active = 0;
  private readonly waiters: MarkdownQueueWaiter[] = [];

  constructor(
    private readonly maxActive: number = markdownLimits.maxConcurrentWorkers,
    private readonly maxQueued: number = markdownLimits.maxQueuedValidations,
    private readonly waitTimeoutMs: number = markdownLimits.workerQueueTimeoutMs,
  ) {
    if (
      !Number.isInteger(maxActive) ||
      maxActive < 1 ||
      !Number.isInteger(maxQueued) ||
      maxQueued < 0 ||
      !Number.isFinite(waitTimeoutMs) ||
      waitTimeoutMs < 1
    ) {
      throw new TypeError("Invalid Markdown worker semaphore limits.");
    }
  }

  get activeCount(): number {
    return this.active;
  }

  get waitingCount(): number {
    return this.waiters.length;
  }

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) {
      throw new DOMException("Validation aborted.", "AbortError");
    }

    if (this.active < this.maxActive) {
      this.active += 1;
      return this.createRelease();
    }

    if (this.waiters.length >= this.maxQueued) {
      throw new DOMException("Markdown validation queue is full.", "QuotaExceededError");
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      };
      const finish = (action: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        action();
      };
      const removeWaiter = () => {
        const index = this.waiters.indexOf(waiter);
        if (index !== -1) {
          this.waiters.splice(index, 1);
        }
      };
      const onAbort = () => {
        removeWaiter();
        waiter.reject(new DOMException("Validation aborted.", "AbortError"));
      };

      const waiter: MarkdownQueueWaiter = {
        grant: () => finish(resolve),
        reject: (error) => finish(() => reject(error)),
      };
      const timeout = setTimeout(() => {
        removeWaiter();
        waiter.reject(new DOMException("Markdown validation queue timed out.", "TimeoutError"));
      }, this.waitTimeoutMs);
      signal?.addEventListener("abort", onAbort, { once: true });
      this.waiters.push(waiter);

      if (signal?.aborted) {
        onAbort();
      }
    });

    return this.createRelease();
  }

  private createRelease(): () => void {
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter.grant();
      } else {
        this.active -= 1;
      }
    };
  }
}

const semaphore = new MarkdownWorkerSemaphore();

const defaultWorkerClientDependencies: MarkdownWorkerClientDependencies = {
  createWorker: () =>
    new Worker(resolveMarkdownWorkerUrl(), {
      execArgv: ["--conditions=react-server"],
      name: "promptube-secure-markdown-validator",
      resourceLimits: {
        maxOldGenerationSizeMb: markdownLimits.workerMaxOldGenerationMb,
        maxYoungGenerationSizeMb: markdownLimits.workerMaxYoungGenerationMb,
        stackSizeMb: markdownLimits.workerStackMb,
      },
    }),
  reportDependencies: defaultMarkdownReportDependencies,
  timeoutMs: markdownLimits.workerTimeoutMs,
  semaphore,
};

function resolveMarkdownWorkerUrl(): URL {
  return pathToFileURL(resolve(process.cwd(), "src/server/markdown/markdown-worker.mts"));
}

export function createMarkdownWorkerClient(
  dependencies: MarkdownWorkerClientDependencies = defaultWorkerClientDependencies,
): (input: MarkdownValidationInput) => Promise<MarkdownValidationResult> {
  return async (unsafeInput) => {
    const startedAt = dependencies.reportDependencies.monotonicNow();
    const input = normalizeMarkdownValidationInput(unsafeInput);
    if (!input) {
      return buildMalformedInputFailure(startedAt, dependencies.reportDependencies);
    }

    if (input.bytes.byteLength > markdownLimits.maxBytes || input.signal?.aborted) {
      return buildParentFailure(
        input,
        markdownErrorCodes.resourceLimit,
        startedAt,
        dependencies.reportDependencies,
      );
    }

    let release: (() => void) | undefined;
    try {
      release = await (dependencies.semaphore ?? semaphore).acquire(input.signal);
    } catch {
      return buildParentFailure(
        input,
        markdownErrorCodes.resourceLimit,
        startedAt,
        dependencies.reportDependencies,
      );
    }

    try {
      if (input.signal?.aborted) {
        return buildParentFailure(
          input,
          markdownErrorCodes.resourceLimit,
          startedAt,
          dependencies.reportDependencies,
        );
      }
      return await runWorker(input, startedAt, dependencies);
    } finally {
      release();
    }
  };
}

async function runWorker(
  input: MarkdownValidationInput,
  startedAt: number,
  dependencies: MarkdownWorkerClientDependencies,
): Promise<MarkdownValidationResult> {
  let worker: Worker;
  try {
    worker = dependencies.createWorker();
  } catch {
    return buildParentFailure(
      input,
      markdownErrorCodes.dependencyFailure,
      startedAt,
      dependencies.reportDependencies,
    );
  }

  const workerInput: MarkdownWorkerInput = {
    bytes: new Uint8Array(input.bytes),
    path: input.path,
    manifestFiles: [...input.manifestFiles],
    correlationId: input.correlationId,
  };

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(
      () => void settleWithFailure(markdownErrorCodes.resourceLimit),
      dependencies.timeoutMs,
    );

    const onAbort = () => void settleWithFailure(markdownErrorCodes.resourceLimit);
    const onMessage = (message: unknown) => {
      const rebuilt = validateAndRebuildMarkdownWorkerResult(message, workerInput);
      void settle(
        rebuilt ??
          buildParentFailure(
            input,
            markdownErrorCodes.dependencyFailure,
            startedAt,
            dependencies.reportDependencies,
          ),
      );
    };
    const onError = (error: Error) =>
      void settleWithFailure(
        "code" in error && error.code === "ERR_WORKER_OUT_OF_MEMORY"
          ? markdownErrorCodes.resourceLimit
          : markdownErrorCodes.dependencyFailure,
      );
    const onExit = () => void settleWithFailure(markdownErrorCodes.dependencyFailure);

    input.signal?.addEventListener("abort", onAbort, { once: true });
    worker.once("message", onMessage);
    worker.once("error", onError);
    worker.once("exit", onExit);

    try {
      worker.postMessage(workerInput);
    } catch {
      void settleWithFailure(markdownErrorCodes.dependencyFailure);
    }

    async function settle(candidate: MarkdownValidationResult): Promise<void> {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", onAbort);
      worker.removeListener("message", onMessage);
      worker.removeListener("error", onError);
      worker.removeListener("exit", onExit);

      let result = candidate;
      await new Promise<void>((resolve, reject) => {
        worker.terminate().then(() => resolve(), reject);
      }).catch(() => {
        result = buildParentFailure(
          input,
          markdownErrorCodes.dependencyFailure,
          startedAt,
          dependencies.reportDependencies,
        );
      });
      resolve(deepFreezeMarkdownValidationResult(result));
    }

    async function settleWithFailure(code: MarkdownErrorCode): Promise<void> {
      await settle(buildParentFailure(input, code, startedAt, dependencies.reportDependencies));
    }
  });
}

function buildParentFailure(
  input: MarkdownValidationInput,
  code: MarkdownErrorCode,
  startedAt: number,
  dependencies: MarkdownReportDependencies,
): MarkdownValidationResult {
  const metrics = createEmptyMarkdownMetrics(input.bytes.byteLength);
  return deepFreezeMarkdownValidationResult({
    report: buildInvalidMarkdownReport(
      {
        bytes: input.bytes,
        path: input.path,
        correlationId: input.correlationId,
        metrics,
        startedAt,
        dependencies,
      },
      [{ code }],
    ),
    document: null,
  });
}

function buildMalformedInputFailure(
  startedAt: number,
  dependencies: MarkdownReportDependencies,
): MarkdownValidationResult {
  return buildParentFailure(
    {
      bytes: new Uint8Array(),
      path: "<invalid-input>",
      manifestFiles: [],
      correlationId: "<invalid-input>",
    },
    markdownErrorCodes.dependencyFailure,
    startedAt,
    dependencies,
  );
}

function normalizeMarkdownValidationInput(value: unknown): MarkdownValidationInput | null {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return null;
    }
    const record = value as Record<string, unknown>;
    const allowedKeys = new Set(["bytes", "path", "manifestFiles", "correlationId", "signal"]);
    if (Object.keys(record).some((key) => !allowedKeys.has(key))) {
      return null;
    }
    if (
      !isUint8Array(record.bytes) ||
      typeof record.path !== "string" ||
      !Array.isArray(record.manifestFiles) ||
      record.manifestFiles.some((path) => typeof path !== "string") ||
      typeof record.correlationId !== "string" ||
      (record.signal !== undefined && !isAbortSignal(record.signal))
    ) {
      return null;
    }
    return {
      bytes: new Uint8Array(record.bytes),
      path: record.path,
      manifestFiles: [...record.manifestFiles],
      correlationId: record.correlationId,
      ...(record.signal ? { signal: record.signal } : {}),
    };
  } catch {
    return null;
  }
}

function isUint8Array(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) &&
    Object.prototype.toString.call(value) === "[object Uint8Array]" &&
    (value as Uint8Array).BYTES_PER_ELEMENT === 1
  );
}

function isAbortSignal(value: unknown): value is AbortSignal {
  try {
    return value instanceof AbortSignal;
  } catch {
    return false;
  }
}
