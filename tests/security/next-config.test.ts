import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Next.js security configuration", () => {
  it("disables framework disclosure and applies the baseline headers", async () => {
    const routes = await nextConfig.headers?.();
    const headers = Object.fromEntries(
      routes?.flatMap((route) => route.headers.map((header) => [header.key, header.value])) ?? [],
    );

    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(headers).toMatchObject({
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-DNS-Prefetch-Control": "off",
      "X-Frame-Options": "DENY",
    });
  });
});
