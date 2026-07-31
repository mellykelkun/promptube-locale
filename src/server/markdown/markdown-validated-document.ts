import "server-only";

export type ValidatedMarkdownText = Readonly<{
  kind: "text";
  value: string;
}>;

export type ValidatedMarkdownElementProperties = Readonly<{
  href?: string;
  title?: string;
  start?: number;
}>;

export type ValidatedMarkdownElement = Readonly<{
  kind: "element";
  tag:
    | "a"
    | "blockquote"
    | "br"
    | "code"
    | "del"
    | "em"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "hr"
    | "li"
    | "ol"
    | "p"
    | "pre"
    | "strong"
    | "table"
    | "tbody"
    | "td"
    | "th"
    | "thead"
    | "tr"
    | "ul";
  properties: ValidatedMarkdownElementProperties;
  children: readonly ValidatedMarkdownNode[];
}>;

export type ValidatedMarkdownNode = ValidatedMarkdownText | ValidatedMarkdownElement;

export type ValidatedMarkdownDocument = Readonly<{
  contractVersion: string;
  pipelineVersion: string;
  sourceSha256: string;
  nodes: readonly ValidatedMarkdownNode[];
  codeLanguages: readonly (string | null)[];
}>;

export function deepFreezeValidatedDocument(
  document: ValidatedMarkdownDocument,
): ValidatedMarkdownDocument {
  const stack: object[] = [document];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) {
      continue;
    }

    seen.add(current);
    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
    Object.freeze(current);
  }

  return document;
}
