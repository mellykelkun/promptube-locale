import { describe, expect, it } from "vitest";

import { markdownLimits } from "@/server/markdown/markdown-contract.ts";
import { markdownErrorCodes } from "@/server/markdown/markdown-error-codes.ts";
import { parseMarkdown } from "@/server/markdown/markdown-parser.ts";
import {
  validateMarkdownSource,
  type ValidatedMarkdownSource,
} from "@/server/markdown/markdown-source-validation.ts";
import {
  validateForbiddenMarkdownSyntax,
  validateFrontMatter,
} from "@/server/markdown/markdown-syntax-validation.ts";
import { createEmptyMarkdownMetrics } from "@/server/markdown/markdown-types.ts";

const encoder = new TextEncoder();

describe("Markdown source validation", () => {
  it("accepts exact LF and line byte limits", () => {
    const source = `${"é".repeat(markdownLimits.maxLineBytes / 2)}\n`;
    const metrics = createEmptyMarkdownMetrics();

    const result = validateMarkdownSource(encoder.encode(source), "docs/guide.md", metrics);

    expect(result).toEqual<ValidatedMarkdownSource>({ source, path: "docs/guide.md" });
    expect(metrics.lines).toBe(1);
  });

  it.each([
    ["empty file", new Uint8Array(), markdownErrorCodes.limitExceeded],
    [
      "oversized file",
      new Uint8Array(markdownLimits.maxBytes + 1),
      markdownErrorCodes.limitExceeded,
    ],
    ["CRLF", encoder.encode("texte\r\n"), markdownErrorCodes.invalidLineEnding],
    ["isolated CR", encoder.encode("texte\rfin\n"), markdownErrorCodes.invalidLineEnding],
    ["missing final LF", encoder.encode("texte"), markdownErrorCodes.invalidLineEnding],
    ["C0 control", encoder.encode("a\u0007b\n"), markdownErrorCodes.forbiddenCharacter],
    ["C1 control", encoder.encode("a\u0085b\n"), markdownErrorCodes.forbiddenCharacter],
    ["zero width space", encoder.encode("a\u200Bb\n"), markdownErrorCodes.forbiddenCharacter],
    ["embedded FEFF", encoder.encode("a\uFEFFb\n"), markdownErrorCodes.forbiddenCharacter],
  ])("rejects %s", (_name, bytes, expectedCode) => {
    expectSourceFailure(bytes, "README.md", expectedCode);
  });

  it("rejects a line one byte over the limit", () => {
    expectSourceFailure(
      encoder.encode(`${"a".repeat(markdownLimits.maxLineBytes + 1)}\n`),
      "README.md",
      markdownErrorCodes.limitExceeded,
    );
  });

  it.each([
    "/README.md",
    "../README.md",
    "docs//guide.md",
    "docs\\guide.md",
    "docs/guide.MD",
    "docs/guide.md#titre",
    "docs%2Fguide.md",
    "docs/guide sécurisé.md",
    "docs/.cache.md",
    "docs/CON.md",
    `${"a".repeat(81)}.md`,
    `${"a".repeat(241)}.md`,
  ])("rejects invalid logical path %s", (path) => {
    expectSourceFailure(encoder.encode("texte\n"), path, markdownErrorCodes.forbiddenSyntax);
  });
});

describe("conservative MDX and brace policy", () => {
  it.each([
    "\\{échappée\\}\n",
    "`{inline}`\n",
    "`` `{ambigu}` ``\n",
    "```\n{bloc}\n```\n",
    "    {indenté}\n",
  ])("accepts braces in approved inert zones", (source) => {
    expect(() => validateSyntax(source)).not.toThrow();
  });

  it.each(["texte {expression}\n", "texte }\n", "\\\\{non-echappee}\n"])(
    "rejects unescaped braces outside code",
    (source) => {
      expect(() => validateSyntax(source)).toThrow();
    },
  );

  it.each([
    'import Composant from "./Composant"\n',
    'export default "valeur"\n',
    "export function composant()\n",
  ])("rejects conservative MDX module syntax", (source) => {
    expect(() => validateSyntax(source)).toThrow();
  });

  it("does not treat single tildes as GFM deletion", () => {
    const tree = parseMarkdown("texte ~conservé~\n");
    expect(JSON.stringify(tree)).not.toContain('"type":"delete"');
  });

  it("rejects an explicit unresolved reference intent", () => {
    expect(() => validateSyntax("[texte][absente]\n")).toThrow();
  });

  it("rejects only closed front matter blocks", () => {
    expect(() => validateFrontMatter("---\ntitre\n")).not.toThrow();
    expect(() => validateFrontMatter("---\ntitre\n---\n")).toThrow();
    expect(() => validateFrontMatter("+++\ntitre\n+++\n")).toThrow();
  });
});

function validateSyntax(source: string): void {
  validateForbiddenMarkdownSyntax(source, parseMarkdown(source));
}

function expectSourceFailure(bytes: Uint8Array, path: string, expectedCode: string): void {
  try {
    validateMarkdownSource(bytes, path, createEmptyMarkdownMetrics());
    throw new Error("Expected source validation to fail.");
  } catch (error) {
    expect(error).toMatchObject({ issues: [{ code: expectedCode }] });
  }
}
