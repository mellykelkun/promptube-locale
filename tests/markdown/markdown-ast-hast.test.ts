import type { Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import { describe, expect, it } from "vitest";

import { validateMarkdownAst } from "@/server/markdown/markdown-ast-validation.ts";
import { markdownErrorCodes } from "@/server/markdown/markdown-error-codes.ts";
import {
  assertSanitizationMatch,
  normalizeMarkdownHast,
  sanitizeAndValidateHast,
} from "@/server/markdown/markdown-hast-validation.ts";
import { projectMarkdownToHast } from "@/server/markdown/markdown-hast-projection.ts";
import { parseMarkdown } from "@/server/markdown/markdown-parser.ts";
import { createMarkdownValidatorCore } from "@/server/markdown/markdown-validator-core.ts";
import { createEmptyMarkdownMetrics } from "@/server/markdown/markdown-types.ts";

describe("MDAST validation", () => {
  it("rejects duplicate definitions and unresolved references", () => {
    const duplicate = parseMarkdown(
      "[x][a]\n\n[a]: https://example.com\n[a]: https://example.org\n",
    );

    expect(() => validateMarkdownAst(duplicate, createEmptyMarkdownMetrics())).toThrow();
  });

  it.each([
    { type: "code", value: "x", lang: "js", meta: "title=secret" },
    { type: "code", value: "x", lang: "bad language", meta: null },
    { type: "heading", depth: 7, children: [] },
    { type: "list", ordered: true, start: 10_001, spread: false, children: [] },
  ])("rejects invalid node values", (node) => {
    const tree = { type: "root", children: [node] } as unknown as MdastRoot;
    expect(() => validateMarkdownAst(tree, createEmptyMarkdownMetrics())).toThrow();
  });

  it("rejects reused or cyclic node objects", () => {
    const text = { type: "text", value: "x" };
    const tree = { type: "root", children: [text, text] } as unknown as MdastRoot;
    expect(() => validateMarkdownAst(tree, createEmptyMarkdownMetrics())).toThrow();
  });

  it.each([
    { type: "paragraph", children: "not-an-array" },
    { type: "text", value: 42 },
    { type: "link", url: 42, title: null, children: [] },
    { type: "definition", identifier: 42, url: "https://example.com", title: null },
    { type: "table", align: ["dangerous"], children: [] },
  ])("rejects malformed injected node shapes", (node) => {
    const tree = { type: "root", children: [node] } as unknown as MdastRoot;
    expect(() => validateMarkdownAst(tree, createEmptyMarkdownMetrics())).toThrow();
  });
});

describe("closed HAST projection and sanitization", () => {
  it("projects tasks, code and table alignment without generated attributes", async () => {
    const tree = parseMarkdown(
      "- [x] fait\n\n```typescript\nconst x = 1\n```\n\n| A | B |\n| :--- | ---: |\n| 1 | 2 |\n",
    );
    const metrics = createEmptyMarkdownMetrics();
    const summary = validateMarkdownAst(tree, metrics);
    const hast = await projectMarkdownToHast(tree);
    const serialized = JSON.stringify(hast);

    expect(summary.codeLanguages).toEqual(["typescript"]);
    expect(serialized).toContain("[x] ");
    expect(serialized).not.toContain('"input"');
    expect(serialized).not.toContain("className");
    expect(serialized).not.toContain('"align"');
    expect(serialized).not.toContain('"style"');
    await expect(sanitizeAndValidateHast(hast)).resolves.toBeDefined();
  });

  it.each([
    {
      type: "root",
      children: [{ type: "raw", value: "<script>" }],
    },
    {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "script",
          properties: {},
          children: [],
        },
      ],
    },
    {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: { className: ["danger"] },
          children: [],
        },
      ],
    },
  ])("rejects non-closed HAST", (tree) => {
    expect(() => normalizeMarkdownHast(tree as HastRoot)).toThrow();
  });

  it("detects any semantic change after sanitization", () => {
    const before = paragraphTree("avant");
    const after = paragraphTree("après");
    expect(() => assertSanitizationMatch(before, after)).toThrowError(
      expect.objectContaining({
        issues: [{ code: markdownErrorCodes.sanitizationMismatch }],
      }),
    );
  });
});

describe("deterministic reports and fail-closed results", () => {
  it("produces identical reports with fixed internal infrastructure", async () => {
    const dependencies = {
      now: () => new Date("2026-07-31T00:00:00.000Z"),
      randomUuid: () => "00000000-0000-4000-8000-000000000000",
      monotonicNow: (() => {
        let tick = 0;
        return () => (tick++ % 2 === 0 ? 100 : 125);
      })(),
    };
    const validate = createMarkdownValidatorCore(dependencies);
    const input = {
      bytes: new TextEncoder().encode("# Déterministe\n"),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "deterministic",
    };

    const first = await validate(input);
    const second = await validate(input);

    expect(first.report).toEqual(second.report);
    expect(first.report.metrics.durationMs).toBe(25);
    expect(JSON.stringify(first.report)).not.toContain("Déterministe");
  });

  it("returns no partial document for invalid content", async () => {
    const validate = createMarkdownValidatorCore();
    const result = await validate({
      bytes: new TextEncoder().encode("<script>secret</script>\n"),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "invalid",
    });

    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
    expect(result.document).toBeNull();
    expect(JSON.stringify(result.report)).not.toContain("secret");
  });

  it.each(["parse", "project", "sanitize", "validateUrls"] as const)(
    "converts an unexpected %s failure into a closed dependency error",
    async (service) => {
      const validate = createMarkdownValidatorCore({
        now: () => new Date("2026-07-31T00:00:00.000Z"),
        randomUuid: () => "00000000-0000-4000-8000-000000000000",
        monotonicNow: () => 0,
        [service]: () => {
          throw new Error("injected dependency failure");
        },
      });

      const result = await validate({
        bytes: new TextEncoder().encode("# Fail closed\n"),
        path: "README.md",
        manifestFiles: ["README.md"],
        correlationId: "fail-closed",
      });

      expect(result.report.verdict).toBe("MARKDOWN_INVALID");
      expect(result.report.issues).toEqual([{ code: markdownErrorCodes.dependencyFailure }]);
      expect(result.document).toBeNull();
    },
  );
});

function paragraphTree(value: string): HastRoot {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [{ type: "text", value }],
      },
    ],
  };
}
