import "server-only";

import type { Element, ElementContent, Root as HastRoot, Text } from "hast";
import type { Code, Link, LinkReference, ListItem, Nodes, Root, TableRow } from "mdast";
import remarkRehype, { type Options as RemarkRehypeOptions } from "remark-rehype";
import { unified } from "unified";

import { markdownErrorCodes } from "./markdown-error-codes.ts";
import { MarkdownValidationFailure } from "./markdown-validation-failure.ts";

const handlers: NonNullable<RemarkRehypeOptions["handlers"]> = {
  code(state, rawNode) {
    const node = rawNode as Code;
    const code: Element = {
      type: "element",
      tagName: "code",
      properties: {},
      children: [{ type: "text", value: node.value ? `${node.value}\n` : "" }],
    };
    state.patch(node, code);

    const pre: Element = {
      type: "element",
      tagName: "pre",
      properties: {},
      children: [code],
    };
    state.patch(node, pre);
    return pre;
  },
  link(state, rawNode) {
    const node = rawNode as Link;
    return createLinkElement(state.all(node), node.url, node.title ?? undefined);
  },
  linkReference(state, rawNode) {
    const node = rawNode as LinkReference;
    const definition = state.definitionById.get(node.identifier.toUpperCase());
    if (!definition) {
      throw new MarkdownValidationFailure({
        code: markdownErrorCodes.forbiddenSyntax,
        line: node.position?.start.line,
        column: node.position?.start.column,
      });
    }
    return createLinkElement(state.all(node), definition.url, definition.title ?? undefined);
  },
  listItem(state, rawNode) {
    const node = rawNode as ListItem;
    const children = state.all(node);
    if (typeof node.checked === "boolean") {
      prependTaskMarker(children, node.checked);
    }
    const result: Element = {
      type: "element",
      tagName: "li",
      properties: {},
      children: state.wrap(children, true),
    };
    state.patch(node, result);
    return result;
  },
  tableRow(state, rawNode, rawParent) {
    const node = rawNode as TableRow;
    const siblings =
      rawParent && "children" in rawParent ? (rawParent.children as readonly Nodes[]) : [];
    const rowIndex = siblings.findIndex((sibling) => sibling === node);
    const cellTag = rowIndex === 0 ? "th" : "td";
    const cells: Element[] = node.children.map((cell) => ({
      type: "element",
      tagName: cellTag,
      properties: {},
      children: state.all(cell),
    }));
    const result: Element = {
      type: "element",
      tagName: "tr",
      properties: {},
      children: state.wrap(cells, true),
    };
    state.patch(node, result);
    return result;
  },
};

const hastProjector = unified()
  .use(remarkRehype, {
    allowDangerousHtml: false,
    handlers,
    unknownHandler(_state, node) {
      throw new MarkdownValidationFailure({
        code: markdownErrorCodes.forbiddenNode,
        line: node.position?.start.line,
        column: node.position?.start.column,
      });
    },
  })
  .freeze();

export async function projectMarkdownToHast(tree: Root): Promise<HastRoot> {
  return (await hastProjector.run(tree)) as HastRoot;
}

function createLinkElement(children: ElementContent[], href: string, title?: string): Element {
  return {
    type: "element",
    tagName: "a",
    properties: { href, ...(title === undefined ? {} : { title }) },
    children,
  };
}

function prependTaskMarker(children: ElementContent[], checked: boolean): void {
  const marker: Text = { type: "text", value: checked ? "[x] " : "[ ] " };
  const first = children[0];

  if (first?.type === "element" && first.tagName === "p") {
    first.children.unshift(marker);
    return;
  }

  children.unshift({
    type: "element",
    tagName: "p",
    properties: {},
    children: [marker],
  });
}
