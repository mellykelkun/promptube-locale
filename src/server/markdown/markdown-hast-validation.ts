import "server-only";

import type { Element, Nodes, Root } from "hast";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";

import { allowedHastTags } from "./markdown-contract.ts";
import { markdownErrorCodes } from "./markdown-error-codes.ts";
import { markdownSanitizeSchema } from "./markdown-sanitize-schema.ts";
import type {
  ValidatedMarkdownElement,
  ValidatedMarkdownElementProperties,
  ValidatedMarkdownNode,
} from "./markdown-validated-document.ts";
import { MarkdownValidationFailure } from "./markdown-validation-failure.ts";

export type NormalizedMarkdownHast = Readonly<{
  nodes: readonly ValidatedMarkdownNode[];
}>;

const sanitizer = unified().use(rehypeSanitize, markdownSanitizeSchema).freeze();

export async function sanitizeAndValidateHast(tree: Root): Promise<NormalizedMarkdownHast> {
  const before = normalizeMarkdownHast(tree);
  const sanitized = (await sanitizer.run(structuredClone(tree))) as Root;
  const after = normalizeMarkdownHast(sanitized);

  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.sanitizationMismatch,
    });
  }

  return after;
}

export function normalizeMarkdownHast(tree: Root): NormalizedMarkdownHast {
  if (tree.type !== "root" || hasUnknownKeys(tree, new Set(["type", "children", "position"]))) {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenProperty });
  }

  return { nodes: tree.children.map(normalizeNode) };
}

export function assertSanitizationMatch(before: Root, after: Root): void {
  if (
    JSON.stringify(normalizeMarkdownHast(before)) !== JSON.stringify(normalizeMarkdownHast(after))
  ) {
    throw new MarkdownValidationFailure({
      code: markdownErrorCodes.sanitizationMismatch,
    });
  }
}

function normalizeNode(node: Nodes): ValidatedMarkdownNode {
  if (node.type === "text") {
    if (hasUnknownKeys(node, new Set(["type", "value", "position"]))) {
      throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenProperty });
    }
    return { kind: "text", value: node.value };
  }

  if (node.type !== "element") {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenNode });
  }

  if (
    !allowedHastTags.has(node.tagName) ||
    hasUnknownKeys(node, new Set(["type", "tagName", "properties", "children", "position"]))
  ) {
    throw new MarkdownValidationFailure({
      code: allowedHastTags.has(node.tagName)
        ? markdownErrorCodes.forbiddenProperty
        : markdownErrorCodes.forbiddenNode,
    });
  }

  return {
    kind: "element",
    tag: node.tagName as ValidatedMarkdownElement["tag"],
    properties: normalizeProperties(node),
    children: node.children.map(normalizeNode),
  };
}

function normalizeProperties(node: Element): ValidatedMarkdownElementProperties {
  const keys = Object.keys(node.properties).sort();

  if (node.tagName === "a") {
    if (
      keys.some((key) => key !== "href" && key !== "title") ||
      typeof node.properties.href !== "string" ||
      (node.properties.title !== undefined && typeof node.properties.title !== "string")
    ) {
      throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenProperty });
    }
    return {
      href: node.properties.href,
      ...(typeof node.properties.title === "string" ? { title: node.properties.title } : {}),
    };
  }

  if (node.tagName === "ol") {
    if (keys.some((key) => key !== "start")) {
      throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenProperty });
    }
    if (node.properties.start === undefined) {
      return {};
    }
    if (
      typeof node.properties.start !== "number" ||
      !Number.isInteger(node.properties.start) ||
      node.properties.start < 0 ||
      node.properties.start > 10_000
    ) {
      throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenProperty });
    }
    return { start: node.properties.start };
  }

  if (keys.length > 0) {
    throw new MarkdownValidationFailure({ code: markdownErrorCodes.forbiddenProperty });
  }
  return {};
}

function hasUnknownKeys(value: object, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).some((key) => !allowed.has(key));
}
