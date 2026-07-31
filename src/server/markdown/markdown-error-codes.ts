import "server-only";

export const markdownErrorCodes = {
  invalidEncoding: "MARKDOWN_INVALID_ENCODING",
  bomForbidden: "MARKDOWN_BOM_FORBIDDEN",
  invalidLineEnding: "MARKDOWN_INVALID_LINE_ENDING",
  forbiddenCharacter: "MARKDOWN_FORBIDDEN_CHARACTER",
  limitExceeded: "MARKDOWN_LIMIT_EXCEEDED",
  frontMatterForbidden: "MARKDOWN_FRONT_MATTER_FORBIDDEN",
  forbiddenSyntax: "MARKDOWN_FORBIDDEN_SYNTAX",
  forbiddenNode: "MARKDOWN_FORBIDDEN_NODE",
  forbiddenProperty: "MARKDOWN_FORBIDDEN_PROPERTY",
  htmlForbidden: "MARKDOWN_HTML_FORBIDDEN",
  imageForbidden: "MARKDOWN_IMAGE_FORBIDDEN",
  mdxForbidden: "MARKDOWN_MDX_FORBIDDEN",
  unsafeUrl: "MARKDOWN_UNSAFE_URL",
  internalLinkInvalid: "MARKDOWN_INTERNAL_LINK_INVALID",
  internalLinkMissing: "MARKDOWN_INTERNAL_LINK_MISSING",
  sanitizationMismatch: "MARKDOWN_SANITIZATION_MISMATCH",
  renderFailure: "MARKDOWN_RENDER_FAILURE",
  resourceLimit: "MARKDOWN_RESOURCE_LIMIT",
  dependencyFailure: "MARKDOWN_DEPENDENCY_FAILURE",
} as const;

export type MarkdownErrorCode = (typeof markdownErrorCodes)[keyof typeof markdownErrorCodes];
