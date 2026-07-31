import { describe, expect, it } from "vitest";

import { markdownErrorCodes } from "@/server/markdown/markdown-error-codes.ts";
import { validateMarkdownCore } from "@/server/markdown/markdown-validator-core.ts";
import { validateMarkdownUrl } from "@/server/markdown/markdown-url-validation.ts";

const manifest = new Set(["README.md", "docs/guide.md", "docs/API.md"]);

describe("external Markdown URL validation", () => {
  it.each([
    "https://example.com/guide",
    "HTTPS://EXAMPLE.COM/guide",
    "https://éxample.test/guide",
    "https://8.8.8.8/",
    "https://[2606:4700:4700::1111]/",
  ])("accepts admissible HTTPS destination %s", (url) => {
    expect(() => validateMarkdownUrl(url, "README.md", manifest)).not.toThrow();
  });

  it.each([
    "http://example.com/",
    "ftp://example.com/",
    "mailto:test@example.com",
    "javascript:alert(1)",
    "data:text/plain,test",
    "file:///etc/passwd",
    "//example.com/",
    "https://user:password@example.com/",
    "https://localhost/",
    "https://LOCALHOST./",
    "https://service.local/",
    "https://example.com./",
    "https://example.com:0/",
    "https://example.com:65536/",
    "https ://example.com/",
    "https%3A%2F%2Fexample.com/",
  ])("rejects unsafe external destination %s", (url) => {
    expectUrlFailure(url, markdownErrorCodes.unsafeUrl);
  });

  it.each([
    "https://127.0.0.1/",
    "https://127.1/",
    "https://0177.0.0.1/",
    "https://0x7f000001/",
    "https://10.0.0.1/",
    "https://172.16.0.1/",
    "https://192.168.0.1/",
    "https://100.64.0.1/",
    "https://169.254.1.1/",
    "https://0.0.0.0/",
    "https://224.0.0.1/",
    "https://[::1]/",
    "https://[::]/",
    "https://[fc00::1]/",
    "https://[fe80::1]/",
    "https://[ff02::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[::ffff:10.0.0.1]/",
  ])("rejects non-public literal IP %s", (url) => {
    expectUrlFailure(url, markdownErrorCodes.unsafeUrl);
  });

  it("accepts a public IPv4-mapped IPv6 literal", () => {
    expect(() =>
      validateMarkdownUrl("https://[::ffff:8.8.8.8]/", "README.md", manifest),
    ).not.toThrow();
  });

  it.each([
    "[x](JaVaScRiPt:alert(1))\n",
    "[x](java&#x73;cript:alert(1))\n",
    "[x](javascript%3Aalert(1))\n",
    "[x](data&#58;text/plain,test)\n",
  ])("rejects parser-decoded dangerous protocol variants", async (source) => {
    const result = await validateMarkdownCore({
      bytes: new TextEncoder().encode(source),
      path: "README.md",
      manifestFiles: ["README.md"],
      correlationId: "protocol-variants",
    });
    expect(result.report.verdict).toBe("MARKDOWN_INVALID");
  });
});

describe("internal Markdown URL validation", () => {
  it.each([
    ["guide.md", "docs/README.md"],
    ["docs/API.md", "README.md"],
  ])("accepts exact inventoried destination %s", (url, sourcePath) => {
    expect(() => validateMarkdownUrl(url, sourcePath, manifest)).not.toThrow();
  });

  it.each([
    "../guide.md",
    "/docs/guide.md",
    "docs\\guide.md",
    "docs%2Fguide.md",
    "docs/guide.md?x=1",
    "docs/guide.md#titre",
    "docs//guide.md",
    "./guide.md",
    "docs/../guide.md",
    "C:/guide.md",
    "docs/api.md",
  ])("rejects invalid or non-inventoried internal destination %s", (url) => {
    expect(() => validateMarkdownUrl(url, "README.md", manifest)).toThrow();
  });
});

function expectUrlFailure(url: string, code: string): void {
  try {
    validateMarkdownUrl(url, "README.md", manifest);
    throw new Error("Expected URL validation to fail.");
  } catch (error) {
    expect(error).toMatchObject({ issues: [{ code }] });
  }
}
