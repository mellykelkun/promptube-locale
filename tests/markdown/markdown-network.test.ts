import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const markdownDirectory = resolve(process.cwd(), "src/server/markdown");
const sourceFiles = readdirSync(markdownDirectory)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".mts"))
  .map((file) => readFileSync(resolve(markdownDirectory, file), "utf8"))
  .join("\n");

describe("Markdown validator static security boundaries", () => {
  it.each([
    "node:dns",
    "node:http",
    "node:https",
    "node:net",
    "node:tls",
    "node:dgram",
    "fetch(",
    "WebSocket",
    "XMLHttpRequest",
  ])("contains no network primitive %s", (primitive) => {
    expect(sourceFiles).not.toContain(primitive);
  });

  it.each([
    "rehype-raw",
    "allowDangerousHtml: true",
    "dangerouslySetInnerHTML",
    "@mdx-js",
    "remark-frontmatter",
  ])("contains no forbidden parser or renderer primitive %s", (primitive) => {
    expect(sourceFiles).not.toContain(primitive);
  });

  it("does not export internal parsers, policies or sanitizer helpers", () => {
    const publicIndex = readFileSync(resolve(markdownDirectory, "index.ts"), "utf8");
    expect(publicIndex).not.toContain("markdown-parser");
    expect(publicIndex).not.toContain("markdown-sanitize-schema");
    expect(publicIndex).not.toContain("markdown-validator-core");
    expect(publicIndex).not.toContain("markdown-worker-client");
  });
});
