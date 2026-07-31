import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

import { describe, expect, it, vi } from "vitest";

import { markdownDependencyVersions, markdownLimits } from "@/server/markdown/markdown-contract.ts";
import { markdownErrorCodes } from "@/server/markdown/markdown-error-codes.ts";
import type {
  MarkdownValidationInput,
  MarkdownValidationResult,
} from "@/server/markdown/markdown-types.ts";
import { validateSecureMarkdown } from "@/server/markdown/markdown-validator.ts";
import {
  createMarkdownWorkerClient,
  MarkdownWorkerSemaphore,
} from "@/server/markdown/markdown-worker-client.ts";

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

  it("returns a completely and deeply immutable validated result", async () => {
    const result = await validateSecureMarkdown(validInput("# Worker réel\n"));

    expect(result.report.verdict, JSON.stringify(result.report.issues)).toBe("MARKDOWN_VALID");
    expect(result.document).not.toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.report)).toBe(true);
    expect(Object.isFrozen(result.report.issues)).toBe(true);
    expect(Object.isFrozen(result.report.metrics)).toBe(true);
    expect(Object.isFrozen(result.report.dependencyVersions)).toBe(true);
    expect(Object.isFrozen(result.document)).toBe(true);
    expect(Object.isFrozen(result.document?.nodes)).toBe(true);
    expect(Object.isFrozen(result.document?.nodes[0])).toBe(true);
    expect(
      result.document?.nodes[0]?.kind === "element" &&
        Object.isFrozen(result.document.nodes[0].properties),
    ).toBe(true);
    expect(Object.isFrozen(result.document?.codeLanguages)).toBe(true);
  });

  it("returns a closed rejection from the worker", async () => {
    const result = await validateSecureMarkdown(validInput("<script>alert(1)</script>\n"));
    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
    expect(result.document).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.report)).toBe(true);
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

  it.each([
    null,
    {},
    { bytes: "not-bytes", path: "README.md", manifestFiles: [], correlationId: "bad" },
    { bytes: encoder.encode("x\n"), path: 42, manifestFiles: [], correlationId: "bad" },
    {
      bytes: encoder.encode("x\n"),
      path: "README.md",
      manifestFiles: ["README.md", 42],
      correlationId: "bad",
    },
    {
      bytes: encoder.encode("x\n"),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "bad",
      signal: {},
    },
    {
      bytes: encoder.encode("x\n"),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "bad",
      unexpected: true,
    },
  ])("fails closed for malformed public input %#", async (input) => {
    const createWorker = vi.fn();
    const validate = createMarkdownWorkerClient({
      createWorker,
      reportDependencies: fixedReportDependencies,
      timeoutMs: 20,
    });

    const result = await validate(input as MarkdownValidationInput);

    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
    expect(result.report.issues).toEqual([{ code: markdownErrorCodes.dependencyFailure }]);
    expect(result.document).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(createWorker).not.toHaveBeenCalled();
  });
});

describe("closed worker message validation", () => {
  it.each([
    ["empty document", (result: MutableResult) => (result.document!.nodes = [])],
    [
      "unknown report property",
      (result: MutableResult) => (result.report.unexpected = "forbidden"),
    ],
    [
      "unknown tag",
      (result: MutableResult) => {
        result.document!.nodes[0] = {
          kind: "element",
          tag: "script",
          properties: {},
          children: [],
        };
      },
    ],
    [
      "non-textual href",
      (result: MutableResult) => {
        result.document!.nodes[0] = {
          kind: "element",
          tag: "a",
          properties: { href: 42 },
          children: [{ kind: "text", value: "x" }],
        };
      },
    ],
    [
      "document digest mismatch",
      (result: MutableResult) => {
        result.document!.sourceSha256 = "f".repeat(64);
      },
    ],
    [
      "input digest mismatch",
      (result: MutableResult) => {
        result.report.sourceSha256 = "e".repeat(64);
        result.document!.sourceSha256 = "e".repeat(64);
      },
    ],
    [
      "unknown result property",
      (result: MutableResult) => {
        result.unexpected = true;
      },
    ],
  ])("rejects a forged message with %s", async (_name, mutate) => {
    await expectForgedMessageFailure(mutate);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["negative value", -1],
  ])("rejects a forged message with %s metric", async (_name, metric) => {
    await expectForgedMessageFailure((result) => {
      result.report.metrics.durationMs = metric;
    });
  });

  it("rejects a forged issue code", async () => {
    await expectForgedMessageFailure((result) => {
      result.report.verdict = "MARKDOWN_INVALID";
      result.report.issues = [{ code: "MARKDOWN_UNKNOWN" }];
      result.document = null;
    });
  });
});

describe("worker termination and exit handling", () => {
  it("terminates after a successful validated message", async () => {
    const input = validInput("# succès\n");
    const fake = new FakeWorker(validResult(input));
    const result = await fakeClient(fake)(input);
    expect(result.report.verdict).toBe("MARKDOWN_VALID");
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("rejects a shallow or invalid worker message", async () => {
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

  it("fails closed when terminate rejects after a valid message", async () => {
    const input = validInput("# terminaison\n");
    const fake = new FakeWorker(validResult(input), "message", true);

    const result = await fakeClient(fake)(input);

    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
    expect(result.report.issues).toEqual([{ code: markdownErrorCodes.dependencyFailure }]);
    expect(result.document).toBeNull();
  });

  it.each([
    ["exit 0", "exit-zero"],
    ["exit nonzero", "exit-nonzero"],
  ] as const)("fails immediately on %s before any message", async (_name, behavior) => {
    const fake = new FakeWorker(undefined, behavior);

    const result = await fakeClient(fake, 1_000)(validInput("# sortie\n"));

    expect(result.report.issues).toEqual([{ code: markdownErrorCodes.dependencyFailure }]);
    expect(fake.terminate).toHaveBeenCalledOnce();
  });

  it("does not reuse a failed worker", async () => {
    const secondInput = validInput("# second\n");
    const workers = [new FakeWorker(undefined, "error"), new FakeWorker(validResult(secondInput))];
    const createWorker = vi.fn(() => workers.shift() as unknown as Worker);
    const validate = createMarkdownWorkerClient({
      createWorker,
      reportDependencies: fixedReportDependencies,
      timeoutMs: 20,
    });

    await validate(validInput("# premier\n"));
    const second = await validate(secondInput);

    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(second.report.verdict).toBe("MARKDOWN_VALID");
  });
});

describe("bounded Markdown worker queue", () => {
  it("releases queued validations in FIFO order", async () => {
    const semaphore = new MarkdownWorkerSemaphore(1, 2, 100);
    const firstRelease = await semaphore.acquire();
    const order: string[] = [];
    const secondPromise = semaphore.acquire().then((release) => {
      order.push("second");
      return release;
    });
    const thirdPromise = semaphore.acquire().then((release) => {
      order.push("third");
      return release;
    });

    expect(semaphore.waitingCount).toBe(2);
    firstRelease();
    const secondRelease = await secondPromise;
    expect(order).toEqual(["second"]);
    secondRelease();
    const thirdRelease = await thirdPromise;
    expect(order).toEqual(["second", "third"]);
    thirdRelease();
    expect(semaphore.activeCount).toBe(0);
    expect(semaphore.waitingCount).toBe(0);
  });

  it("rejects saturation and resumes without an orphaned waiter", async () => {
    const semaphore = new MarkdownWorkerSemaphore(1, 1, 100);
    const firstRelease = await semaphore.acquire();
    const queued = semaphore.acquire();

    await expect(semaphore.acquire()).rejects.toMatchObject({ name: "QuotaExceededError" });
    expect(semaphore.waitingCount).toBe(1);

    firstRelease();
    const queuedRelease = await queued;
    queuedRelease();
    const recoveryRelease = await semaphore.acquire();
    recoveryRelease();
    expect(semaphore.activeCount).toBe(0);
    expect(semaphore.waitingCount).toBe(0);
  });

  it("expires a queued validation and removes its waiter", async () => {
    const semaphore = new MarkdownWorkerSemaphore(1, 1, 5);
    const firstRelease = await semaphore.acquire();

    await expect(semaphore.acquire()).rejects.toMatchObject({ name: "TimeoutError" });
    expect(semaphore.waitingCount).toBe(0);
    firstRelease();
    expect(semaphore.activeCount).toBe(0);
  });

  it("removes an aborted queued validation", async () => {
    const semaphore = new MarkdownWorkerSemaphore(1, 1, 100);
    const firstRelease = await semaphore.acquire();
    const controller = new AbortController();
    const queued = semaphore.acquire(controller.signal);

    controller.abort();
    await expect(queued).rejects.toMatchObject({ name: "AbortError" });
    expect(semaphore.waitingCount).toBe(0);
    firstRelease();
    expect(semaphore.activeCount).toBe(0);
  });

  it("does not create a worker when the queue is saturated", async () => {
    const semaphore = new MarkdownWorkerSemaphore(1, 1, 1_000);
    const firstWorker = new FakeWorker(undefined, "silent");
    const secondWorker = new FakeWorker(undefined, "silent");
    const workers = [firstWorker, secondWorker];
    const createWorker = vi.fn(() => workers.shift() as unknown as Worker);
    const validate = createMarkdownWorkerClient({
      createWorker,
      reportDependencies: fixedReportDependencies,
      timeoutMs: 1_000,
      semaphore,
    });
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = validate({ ...validInput("# un\n"), signal: firstController.signal });
    await firstWorker.posted;
    const second = validate({ ...validInput("# deux\n"), signal: secondController.signal });

    const saturated = await validate(validInput("# trois\n"));
    expect(saturated.report.issues).toEqual([{ code: markdownErrorCodes.resourceLimit }]);
    expect(createWorker).toHaveBeenCalledTimes(1);

    firstController.abort();
    await first;
    await secondWorker.posted;
    secondController.abort();
    await second;
    expect(semaphore.activeCount).toBe(0);
    expect(semaphore.waitingCount).toBe(0);
  });
});

type FakeWorkerBehavior = "message" | "error" | "silent" | "exit-zero" | "exit-nonzero";

class FakeWorker extends EventEmitter {
  readonly terminate: ReturnType<typeof vi.fn>;
  readonly posted: Promise<void>;
  private markPosted: (() => void) | undefined;

  constructor(
    private readonly response?: unknown,
    private readonly behavior: FakeWorkerBehavior = "message",
    terminateRejects = false,
  ) {
    super();
    this.terminate = vi.fn(() =>
      terminateRejects ? Promise.reject(new Error("terminate failed")) : Promise.resolve(0),
    );
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
      } else if (this.behavior === "exit-zero") {
        this.emit("exit", 0);
      } else if (this.behavior === "exit-nonzero") {
        this.emit("exit", 1);
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

function validInput(source: string): MarkdownValidationInput {
  return {
    bytes: encoder.encode(source),
    path: "README.md",
    manifestFiles: ["README.md"],
    correlationId: "worker-test",
  };
}

function validResult(input: MarkdownValidationInput): MarkdownValidationResult {
  const sourceSha256 = createHash("sha256").update(input.bytes).digest("hex");
  return {
    report: {
      validationId: "00000000-0000-4000-8000-000000000000",
      contractVersion: "0.1.0",
      pipelineVersion: "0.1.0",
      filePath: input.path,
      sourceSha256,
      correlationId: input.correlationId,
      validatedAt: "2026-07-31T00:00:00.000Z",
      dependencyVersions: { ...markdownDependencyVersions },
      metrics: {
        bytes: input.bytes.byteLength,
        lines: 1,
        nodes: 3,
        maxDepth: 2,
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
      sourceSha256,
      nodes: [
        {
          kind: "element",
          tag: "h1",
          properties: {},
          children: [{ kind: "text", value: "x" }],
        },
      ],
      codeLanguages: [],
    },
  };
}

type MutableResult = {
  report: {
    sourceSha256: string;
    verdict: string;
    issues: Array<Record<string, unknown>>;
    metrics: Record<string, number>;
    unexpected?: unknown;
  };
  document: {
    sourceSha256: string;
    nodes: Array<Record<string, unknown>>;
  } | null;
  unexpected?: unknown;
};

async function expectForgedMessageFailure(mutate: (result: MutableResult) => void): Promise<void> {
  const input = validInput("# message\n");
  const forged = structuredClone(validResult(input)) as unknown as MutableResult;
  mutate(forged);

  const result = await fakeClient(new FakeWorker(forged))(input);

  expect(result.report.verdict).toBe("MARKDOWN_INVALID");
  expect(result.report.issues).toEqual([{ code: markdownErrorCodes.dependencyFailure }]);
  expect(result.document).toBeNull();
}
