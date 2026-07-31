import { createRequire } from "node:module";

import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import { describe, expect, it, vi } from "vitest";

import {
  fixtureBytes,
  invalidMarkdownFixtures,
  validMarkdownFixtures,
  type MarkdownFixture,
} from "../fixtures/markdown/scenarios";
import { validateMarkdownAst } from "@/server/markdown/markdown-ast-validation.ts";
import { assertSanitizationMatch } from "@/server/markdown/markdown-hast-validation.ts";
import { markdownErrorCodes } from "@/server/markdown/markdown-error-codes.ts";
import { validateMarkdownCore } from "@/server/markdown/markdown-validator-core.ts";
import { createEmptyMarkdownMetrics } from "@/server/markdown/markdown-types.ts";

const require = createRequire(import.meta.url);
const dns = require("node:dns") as typeof import("node:dns");
const http = require("node:http") as typeof import("node:http");
const https = require("node:https") as typeof import("node:https");
const net = require("node:net") as typeof import("node:net");

describe("secure Markdown contractual acceptances", () => {
  it.each(validMarkdownFixtures)("$name", async (fixture) => {
    const result = await validateMarkdownCore({
      bytes: fixtureBytes(fixture),
      path: fixture.path ?? "README.md",
      manifestFiles: fixture.manifestFiles ?? ["README.md"],
      correlationId: "acceptance-suite",
    });

    expect(result.report.verdict).toBe("MARKDOWN_VALID");
    expect(result.report.issues).toEqual([]);
    expect(result.document).not.toBeNull();
    expect(JSON.stringify(result.document)).not.toContain("<input");
    expect(JSON.stringify(result.document)).not.toContain("className");
  });
});

describe("secure Markdown contractual rejections", () => {
  it.each(invalidMarkdownFixtures)("$name", async (fixture) => {
    if (fixture.hook) {
      await expectHookRejection(fixture);
      return;
    }

    const result = await validateMarkdownCore({
      bytes: fixtureBytes(fixture),
      path: fixture.path ?? "README.md",
      manifestFiles: fixture.manifestFiles ?? ["README.md"],
      correlationId: "rejection-suite",
    });

    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
    expect(result.report.issues.length).toBeGreaterThan(0);
    expect(result.document).toBeNull();
  });
});

async function expectHookRejection(fixture: MarkdownFixture): Promise<void> {
  if (fixture.hook === "unknown-node" || fixture.hook === "forbidden-property") {
    const node =
      fixture.hook === "unknown-node"
        ? { type: "dangerousPluginNode", value: "x" }
        : { type: "text", value: "x", data: { hName: "script" } };
    const tree = { type: "root", children: [node] } as unknown as MdastRoot;
    expect(() => validateMarkdownAst(tree, createEmptyMarkdownMetrics())).toThrow();
    return;
  }

  if (fixture.hook === "sanitize-mismatch") {
    const before: HastRoot = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [{ type: "text", value: "avant" }],
        },
      ],
    };
    const after = structuredClone(before);
    after.children[0] = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [{ type: "text", value: "après" }],
    };
    expect(() => assertSanitizationMatch(before, after)).toThrow();
    return;
  }

  const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
  const dnsSpy = vi.spyOn(dns, "lookup");
  const httpSpy = vi.spyOn(http, "request");
  const httpsSpy = vi.spyOn(https, "request");
  const connectSpy = vi.spyOn(net, "connect");
  const createConnectionSpy = vi.spyOn(net, "createConnection");

  const result = await validateMarkdownCore({
    bytes: new TextEncoder().encode("[externe](https://example.com/guide)\n"),
    path: "README.md",
    manifestFiles: ["README.md"],
    correlationId: "no-network-suite",
  });

  expect(result.report.verdict).toBe("MARKDOWN_VALID");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(dnsSpy).not.toHaveBeenCalled();
  expect(httpSpy).not.toHaveBeenCalled();
  expect(httpsSpy).not.toHaveBeenCalled();
  expect(connectSpy).not.toHaveBeenCalled();
  expect(createConnectionSpy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  expect(markdownErrorCodes.dependencyFailure).toBe("MARKDOWN_DEPENDENCY_FAILURE");
}
