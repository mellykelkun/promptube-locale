import { describe, expect, it } from "vitest";

import { markdownLimits } from "@/server/markdown/markdown-contract.ts";
import { validateMarkdownCore } from "@/server/markdown/markdown-validator-core.ts";

const encoder = new TextEncoder();

describe("provisional Markdown boundary measurements", () => {
  it.each([
    ["one MiB source", `${`${"a".repeat(markdownLimits.maxLineBytes - 1)}\n`.repeat(32)}`],
    ["maximum line", `${"a".repeat(markdownLimits.maxLineBytes)}\n`],
    ["depth 16", `${"> ".repeat(14)}contenu\n`],
    ["25,000 nodes", `${"x\n\n".repeat(12_499)}---\n`],
    ["representative delimiter input", `${"*".repeat(30_000)}\n`],
  ])("measures %s without an unstable wall-clock assertion", async (_name, source) => {
    const result = await validateMarkdownCore({
      bytes: encoder.encode(source),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "performance-suite",
    });

    expect(result.report.verdict).toBe("MARKDOWN_VALID");
    expect(result.report.metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.report.metrics.bytes).toBeLessThanOrEqual(markdownLimits.maxBytes);
  });

  it("measures a table near the cell limit", async () => {
    const header = Array.from({ length: 32 }, (_, index) => `h${index}`).join(" | ");
    const separator = Array.from({ length: 32 }, () => "---").join(" | ");
    const row = Array.from({ length: 32 }, () => "x").join(" | ");
    const source = `${header}\n${separator}\n${`${row}\n`.repeat(310)}`;

    const result = await validateMarkdownCore({
      bytes: encoder.encode(source),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "performance-table",
    });

    expect(result.report.verdict).toBe("MARKDOWN_VALID");
    expect(result.report.metrics.tableCells).toBeLessThanOrEqual(markdownLimits.maxTableCells);
    expect(result.report.metrics.durationMs).toBeGreaterThanOrEqual(0);
  });
});
