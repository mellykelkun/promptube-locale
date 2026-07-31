import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()",
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "./src/server/markdown/**/*",
      "./node_modules/@ungap/structured-clone/**/*",
      "./node_modules/{bail,ccount,character-entities,debug,decode-named-character-reference,dequal,devlop,escape-string-regexp,extend,hast-util-sanitize,ipaddr.js,is-plain-obj,longest-streak,markdown-table,mdast-util-*,micromark,micromark-*,ms,rehype-sanitize,remark-*,server-only,trim-lines,trough,unified,unist-util-*,vfile,vfile-message,zwitch}/**/*",
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
