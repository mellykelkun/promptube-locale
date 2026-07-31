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
import { deepFreezeValidatedDocument } from "./markdown-validated-document.ts";

type WorkerFactory = () => Worker;

type MarkdownWorkerClientDependencies = Readonly<{
  createWorker: WorkerFactory;
  reportDependencies: MarkdownReportDependencies;
  timeoutMs: number;
}>;

class MarkdownWorkerSemaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) {
      throw new DOMException("Validation aborted.", "AbortError");
    }

    if (this.active >= markdownLimits.maxConcurrentWorkers) {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          const index = this.waiters.indexOf(onReady);
          if (index !== -1) {
            this.waiters.splice(index, 1);
          }
          reject(new DOMException("Validation aborted.", "AbortError"));
        };
        const onReady = () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this.waiters.push(onReady);
      });
    }

    this.active += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.active -= 1;
      this.waiters.shift()?.();
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
};

function resolveMarkdownWorkerUrl(): URL {
  return pathToFileURL(resolve(process.cwd(), "src/server/markdown/markdown-worker.mts"));
}

export function createMarkdownWorkerClient(
  dependencies: MarkdownWorkerClientDependencies = defaultWorkerClientDependencies,
): (input: MarkdownValidationInput) => Promise<MarkdownValidationResult> {
  return async (input) => {
    const startedAt = dependencies.reportDependencies.monotonicNow();
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
      release = await semaphore.acquire(input.signal);
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

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(
      () => void settleWithFailure(markdownErrorCodes.resourceLimit),
      dependencies.timeoutMs,
    );

    const onAbort = () => void settleWithFailure(markdownErrorCodes.resourceLimit);
    input.signal?.addEventListener("abort", onAbort, { once: true });

    worker.once("message", (message: unknown) => {
      if (!isMarkdownValidationResult(message)) {
        void settleWithFailure(markdownErrorCodes.dependencyFailure);
        return;
      }
      void settle(message);
    });
    worker.once(
      "error",
      (error) =>
        void settleWithFailure(
          "code" in error && error.code === "ERR_WORKER_OUT_OF_MEMORY"
            ? markdownErrorCodes.resourceLimit
            : markdownErrorCodes.dependencyFailure,
        ),
    );
    worker.once("exit", (code) => {
      if (!settled && code !== 0) {
        void settleWithFailure(markdownErrorCodes.dependencyFailure);
      }
    });

    const workerInput: MarkdownWorkerInput = {
      bytes: new Uint8Array(input.bytes),
      path: input.path,
      manifestFiles: [...input.manifestFiles],
      correlationId: input.correlationId,
    };
    try {
      worker.postMessage(workerInput);
    } catch {
      void settleWithFailure(markdownErrorCodes.dependencyFailure);
    }

    async function settle(result: MarkdownValidationResult): Promise<void> {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", onAbort);
      try {
        await worker.terminate();
      } catch {
        // The result remains fail-closed even if an already failed worker cannot terminate cleanly.
      }
      if (result.document) {
        deepFreezeValidatedDocument(result.document);
      }
      resolve(result);
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
  return {
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
  };
}

function isMarkdownValidationResult(value: unknown): value is MarkdownValidationResult {
  if (!value || typeof value !== "object" || !("report" in value) || !("document" in value)) {
    return false;
  }
  const candidate = value as {
    report?: { verdict?: unknown; issues?: unknown };
    document?: unknown;
  };
  if (
    !candidate.report ||
    !Array.isArray(candidate.report.issues) ||
    (candidate.report.verdict !== "MARKDOWN_VALID" &&
      candidate.report.verdict !== "MARKDOWN_INVALID")
  ) {
    return false;
  }
  return candidate.report.verdict === "MARKDOWN_VALID"
    ? Boolean(candidate.document)
    : candidate.document === null;
}
