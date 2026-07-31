import "server-only";

import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const markdownParser = unified().use(remarkParse).use(remarkGfm, { singleTilde: false }).freeze();

export function parseMarkdown(source: string): Root {
  return markdownParser.parse(source) as Root;
}
