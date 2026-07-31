import "server-only";

import type rehypeSanitize from "rehype-sanitize";

import { allowedHastTags } from "./markdown-contract.ts";

type MarkdownSanitizeSchema = NonNullable<Parameters<typeof rehypeSanitize>[0]>;

export const markdownSanitizeSchema: MarkdownSanitizeSchema = {
  tagNames: [...allowedHastTags],
  attributes: {
    a: ["href", "title"],
    ol: ["start"],
  },
  protocols: {
    href: ["https"],
  },
};
