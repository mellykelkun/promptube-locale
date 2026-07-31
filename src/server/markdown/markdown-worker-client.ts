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
  type MarkdownIssue,
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

type InputNormalizationSuccess = Readonly<{
  ok: true;
  input: MarkdownValidationInput;
}>;

type InputNormalizationFailure = Readonly<{
  ok: false;
  code: MarkdownErrorCode;
  byteLength?: number;
  path?: string;
  correlationId?: string;
  limit?: number;
  actual?: number;
}>;

type InputNormalizationResult = InputNormalizationSuccess | InputNormalizationFailure;

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

const publicInputKeys = new Set(["bytes", "path", "manifestFiles", "correlationId", "signal"]);
const missingDataProperty = Symbol("missing Markdown input data property");

function resolveMarkdownWorkerUrl(): URL {
  return pathToFileURL(resolve(process.cwd(), "src/server/markdown/markdown-worker.mts"));
}

export function createMarkdownWorkerClient(
  dependencies: MarkdownWorkerClientDependencies = defaultWorkerClientDependencies,
): (input: MarkdownValidationInput) => Promise<MarkdownValidationResult> {
  return async (unsafeInput) => {
    const startedAt = dependencies.reportDependencies.monotonicNow();
    const normalized = normalizeMarkdownValidationInput(unsafeInput);
    if (!normalized.ok) {
      return buildInputNormalizationFailure(normalized, startedAt, dependencies.reportDependencies);
    }
    const input = normalized.input;

    if (input.signal?.aborted) {
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

function buildInputNormalizationFailure(
  failure: InputNormalizationFailure,
  startedAt: number,
  dependencies: MarkdownReportDependencies,
): MarkdownValidationResult {
  const metrics = createEmptyMarkdownMetrics(failure.byteLength ?? 0);
  const issue: MarkdownIssue = {
    code: failure.code,
    ...(failure.limit === undefined ? {} : { limit: failure.limit }),
    ...(failure.actual === undefined ? {} : { actual: failure.actual }),
  };
  return deepFreezeMarkdownValidationResult({
    report: buildInvalidMarkdownReport(
      {
        bytes: new Uint8Array(),
        path: failure.path ?? "<invalid-input>",
        correlationId: failure.correlationId ?? "<invalid-input>",
        metrics,
        startedAt,
        dependencies,
      },
      [issue],
    ),
    document: null,
  });
}

function normalizeMarkdownValidationInput(value: unknown): InputNormalizationResult {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return malformedInput();
    }
    const record = value as Record<string, unknown>;
    if (!hasOnlyExpectedEnumerableOwnKeys(record, publicInputKeys)) {
      return malformedInput();
    }

    const unsafeBytes = readOwnDataProperty(record, "bytes");
    if (!isUint8Array(unsafeBytes)) {
      return malformedInput();
    }
    const byteLength = unsafeBytes.byteLength;
    if (byteLength > markdownLimits.maxBytes) {
      return resourceLimitFailure({
        byteLength,
        limit: markdownLimits.maxBytes,
        actual: byteLength,
      });
    }

    const unsafePath = readOwnDataProperty(record, "path");
    if (typeof unsafePath !== "string" || !isBoundedPath(unsafePath)) {
      return malformedInput({ byteLength });
    }

    const unsafeCorrelationId = readOwnDataProperty(record, "correlationId");
    if (typeof unsafeCorrelationId !== "string" || !isBoundedCorrelationId(unsafeCorrelationId)) {
      return malformedInput({ byteLength, path: unsafePath });
    }

    const unsafeManifestFiles = readOwnDataProperty(record, "manifestFiles");
    const manifestFiles = normalizeManifestFiles(unsafeManifestFiles, byteLength, unsafePath);
    if (!manifestFiles.ok) {
      return {
        ...manifestFiles,
        correlationId: unsafeCorrelationId,
      };
    }

    const unsafeSignal = readOwnDataProperty(record, "signal");
    if (
      unsafeSignal !== missingDataProperty &&
      unsafeSignal !== undefined &&
      !isAbortSignal(unsafeSignal)
    ) {
      return malformedInput({
        byteLength,
        path: unsafePath,
        correlationId: unsafeCorrelationId,
      });
    }
    return {
      ok: true,
      input: {
        bytes: new Uint8Array(unsafeBytes),
        path: unsafePath,
        manifestFiles: manifestFiles.value,
        correlationId: unsafeCorrelationId,
        ...(unsafeSignal !== missingDataProperty && unsafeSignal !== undefined
          ? { signal: unsafeSignal }
          : {}),
      },
    };
  } catch {
    return malformedInput();
  }
}

function normalizeManifestFiles(
  value: unknown,
  byteLength: number,
  path: string,
): InputNormalizationFailure | Readonly<{ ok: true; value: readonly string[] }> {
  if (!Array.isArray(value)) {
    return malformedInput({ byteLength, path });
  }

  const length = value.length;
  if (length > markdownLimits.maxManifestFiles) {
    return resourceLimitFailure({
      byteLength,
      path,
      limit: markdownLimits.maxManifestFiles,
      actual: length,
    });
  }
  if (!hasOnlyCanonicalArrayIndexKeys(value, length)) {
    return malformedInput({ byteLength, path });
  }

  const manifestFiles: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    if (!descriptor || !("value" in descriptor)) {
      return malformedInput({ byteLength, path });
    }
    const manifestPath = descriptor.value;
    if (typeof manifestPath !== "string" || !isBoundedPath(manifestPath)) {
      return malformedInput({ byteLength, path });
    }
    manifestFiles.push(manifestPath);
  }

  return { ok: true, value: manifestFiles };
}

function malformedInput(
  context: Omit<InputNormalizationFailure, "ok" | "code"> = {},
): InputNormalizationFailure {
  return {
    ok: false,
    code: markdownErrorCodes.dependencyFailure,
    ...context,
  };
}

function resourceLimitFailure(
  context: Omit<InputNormalizationFailure, "ok" | "code">,
): InputNormalizationFailure {
  return {
    ok: false,
    code: markdownErrorCodes.resourceLimit,
    ...context,
  };
}

function readOwnDataProperty(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && "value" in descriptor ? descriptor.value : missingDataProperty;
}

function hasOnlyExpectedEnumerableOwnKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): boolean {
  let ownKeyCount = 0;
  for (const key in value) {
    if (!Object.hasOwn(value, key)) {
      continue;
    }
    if (!allowedKeys.has(key)) {
      return false;
    }
    ownKeyCount += 1;
    if (ownKeyCount > allowedKeys.size) {
      return false;
    }
  }
  return true;
}

function hasOnlyCanonicalArrayIndexKeys(value: readonly unknown[], length: number): boolean {
  let ownKeyCount = 0;
  for (const key in value) {
    if (!Object.hasOwn(value, key)) {
      continue;
    }
    if (!isCanonicalArrayIndex(key, length)) {
      return false;
    }
    ownKeyCount += 1;
    if (ownKeyCount > length) {
      return false;
    }
  }
  return true;
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (key === "0") {
    return length > 0;
  }
  if (!/^[1-9][0-9]*$/u.test(key)) {
    return false;
  }
  const index = Number(key);
  return Number.isSafeInteger(index) && index < length && String(index) === key;
}

function isBoundedPath(path: string): boolean {
  return path.length <= markdownLimits.maxReportPathCharacters;
}

function isBoundedCorrelationId(correlationId: string): boolean {
  return correlationId.length <= markdownLimits.maxCorrelationIdCharacters;
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
