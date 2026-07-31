import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

import { describe, expect, it, vi } from "vitest";

import { markdownLimits } from "@/server/markdown/markdown-contract.ts";
import { markdownErrorCodes } from "@/server/markdown/markdown-error-codes.ts";
import type { MarkdownValidationResult } from "@/server/markdown/markdown-types.ts";
import { validateSecureMarkdown } from "@/server/markdown/markdown-validator.ts";
import { createMarkdownWorkerClient } from "@/server/markdown/markdown-worker-client.ts";

const encoder = new TextEncoder();
const fixedReportDependencies = {
  now: () => new Date("2026-07-31T00:00:00.000Z"),
  randomUuid: () => "00000000-0000-4000-8000-000000000000",
  monotonicNow: () => 0,
};

describe("real secure Markdown worker", () => {
  it("loads the TypeScript worker entry under Vitest", async () => {
    const worker = new Worker(
      pathToFileURL(resolve(process.cwd(), "src/server/markdown/markdown-worker.mts")),
      {
        execArgv: ["--conditions=react-server"],
        resourceLimits: {
          maxOldGenerationSizeMb: markdownLimits.workerMaxOldGenerationMb,
          maxYoungGenerationSizeMb: markdownLimits.workerMaxYoungGenerationMb,
          stackSizeMb: markdownLimits.workerStackMb,
        },
      },
    );
    const result = await new Promise<unknown>((resolve, reject) => {
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.postMessage(validInput("# Entrée directe\n"));
    });
    await worker.terminate();
    expect(result).toMatchObject({ report: { verdict: "MARKDOWN_VALID" } });
  });

  it("returns a deeply immutable validated DTO and terminates", async () => {
    const result = await validateSecureMarkdown(validInput("# Worker réel\n"));

    expect(result.report.verdict, JSON.stringify(result.report.issues)).toBe("MARKDOWN_VALID");
    expect(result.document).not.toBeNull();
    expect(Object.isFrozen(result.document)).toBe(true);
    expect(Object.isFrozen(result.document?.nodes)).toBe(true);
  });

  it("returns a closed rejection from the worker", async () => {
    const result = await validateSecureMarkdown(validInput("<script>alert(1)</script>\n"));
    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
    expect(result.document).toBeNull();
  });

  it("handles an already aborted signal without creating a worker", async () => {
    const controller = new AbortController();
    controller.abort();
    const createWorker = vi.fn();
    const validate = createMarkdownWorkerClient({
      createWorker,
      reportDependencies: fixedReportDependencies,
      timeoutMs: 20,
    });

    const result = await validate({ ...validInput("# annulé\n"), signal: controller.signal });

    expect(result.report.issues[0]?.code).toBe(markdownErrorCodes.resourceLimit);
    expect(createWorker).not.toHaveBeenCalled();
  });
});

describe("worker failure handling", () => {
  it("terminates after a successful message", async () => {
    const fake = new FakeWorker(validResult());
    const result = await fakeClient(fake)(validInput("# succès\n"));
    expect(result.report.verdict).toBe("MARKDOWN_VALID");
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("rejects an invalid worker message", async () => {
    const fake = new FakeWorker({ unexpected: true });
    const result = await fakeClient(fake)(validInput("# invalide\n"));
    expect(result.report.issues[0]?.code).toBe(markdownErrorCodes.dependencyFailure);
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("converts a worker crash into a dependency failure", async () => {
    const fake = new FakeWorker(undefined, "error");
    const result = await fakeClient(fake)(validInput("# crash\n"));
    expect(result.report.issues[0]?.code).toBe(markdownErrorCodes.dependencyFailure);
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("terminates a timed out worker", async () => {
    const fake = new FakeWorker(undefined, "silent");
    const result = await fakeClient(fake, 5)(validInput("# timeout\n"));
    expect(result.report.issues[0]?.code).toBe(markdownErrorCodes.resourceLimit);
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("terminates a running worker after AbortSignal", async () => {
    const fake = new FakeWorker(undefined, "silent");
    const controller = new AbortController();
    const promise = fakeClient(
      fake,
      100,
    )({
      ...validInput("# interruption\n"),
      signal: controller.signal,
    });
    await fake.posted;
    controller.abort();

    const result = await promise;
    expect(result.report.issues[0]?.code).toBe(markdownErrorCodes.resourceLimit);
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("does not reuse a failed worker", async () => {
    const workers = [new FakeWorker(undefined, "error"), new FakeWorker(validResult())];
    const createWorker = vi.fn(() => workers.shift() as unknown as Worker);
    const validate = createMarkdownWorkerClient({
      createWorker,
      reportDependencies: fixedReportDependencies,
      timeoutMs: 20,
    });

    await validate(validInput("# premier\n"));
    const second = await validate(validInput("# second\n"));

    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(second.report.verdict).toBe("MARKDOWN_VALID");
  });
});

class FakeWorker extends EventEmitter {
  readonly terminate = vi.fn(async () => 0);
  readonly posted: Promise<void>;
  private markPosted: (() => void) | undefined;

  constructor(
    private readonly response?: unknown,
    private readonly behavior: "message" | "error" | "silent" = "message",
  ) {
    super();
    this.posted = new Promise((resolve) => {
      this.markPosted = resolve;
    });
  }

  postMessage(): void {
    this.markPosted?.();
    if (this.behavior === "silent") {
      return;
    }
    queueMicrotask(() => {
      if (this.behavior === "error") {
        this.emit("error", new Error("worker crash"));
      } else {
        this.emit("message", this.response);
      }
    });
  }
}

function fakeClient(fake: FakeWorker, timeoutMs = 20) {
  return createMarkdownWorkerClient({
    createWorker: () => fake as unknown as Worker,
    reportDependencies: fixedReportDependencies,
    timeoutMs,
  });
}

function validInput(source: string) {
  return {
    bytes: encoder.encode(source),
    path: "README.md",
    manifestFiles: ["README.md"],
    correlationId: "worker-test",
  };
}

function validResult(): MarkdownValidationResult {
  return {
    report: {
      validationId: "00000000-0000-4000-8000-000000000000",
      contractVersion: "0.1.0",
      pipelineVersion: "0.1.0",
      filePath: "README.md",
      sourceSha256: "0".repeat(64),
      correlationId: "worker-test",
      validatedAt: "2026-07-31T00:00:00.000Z",
      dependencyVersions: {},
      metrics: {
        bytes: 0,
        lines: 1,
        nodes: 2,
        maxDepth: 1,
        links: 0,
        definitions: 0,
        tables: 0,
        tableRows: 0,
        tableColumns: 0,
        tableCells: 0,
        codeBlockBytes: 0,
        durationMs: 1,
      },
      verdict: "MARKDOWN_VALID",
      issues: [],
    },
    document: {
      contractVersion: "0.1.0",
      pipelineVersion: "0.1.0",
      sourceSha256: "0".repeat(64),
      nodes: [],
      codeLanguages: [],
    },
  };
}
