import "server-only";

import { parentPort } from "node:worker_threads";

import type { MarkdownWorkerInput } from "./markdown-types.ts";
import { validateMarkdownCore } from "./markdown-validator-core.ts";

if (!parentPort) {
  throw new Error("The Markdown worker must run in a worker thread.");
}

const workerPort = parentPort;

workerPort.once("message", async (input: MarkdownWorkerInput) => {
  const result = await validateMarkdownCore(input);
  workerPort.postMessage(result);
});
