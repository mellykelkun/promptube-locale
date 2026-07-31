import "server-only";

export function parseJsonObjectWithoutDuplicateKeys(bytes: Uint8Array): Record<string, unknown> {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new TypeError("JSON BOM forbidden.");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new TypeError("Invalid JSON encoding.");
  }

  assertNoDuplicateJsonObjectKeys(text);
  const parsed = JSON.parse(text) as unknown;
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.getPrototypeOf(parsed) !== Object.prototype
  ) {
    throw new TypeError("Manifest root must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function stableJsonStringify(value: unknown): string {
  return `${stringifyCanonical(value)}\n`;
}

function stringifyCanonical(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyCanonical(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((left, right) =>
      Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")),
    );
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stringifyCanonical(record[key])}`)
      .join(",")}}`;
  }

  throw new TypeError("Unsupported JSON value.");
}

function assertNoDuplicateJsonObjectKeys(text: string): void {
  type ObjectFrame = { keys: Set<string> };
  const stack: Array<ObjectFrame | null> = [];
  let inString = false;
  let escape = false;
  let tokenStart = -1;
  let lastString: string | null = null;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
        lastString = text.slice(tokenStart + 1, index);
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      tokenStart = index;
      continue;
    }

    if (char === "{") {
      stack.push({ keys: new Set() });
      lastString = null;
      continue;
    }
    if (char === "[") {
      stack.push(null);
      lastString = null;
      continue;
    }
    if (char === "}" || char === "]") {
      stack.pop();
      lastString = null;
      continue;
    }
    if (char === ":" && lastString !== null) {
      const frame = stack[stack.length - 1];
      if (frame) {
        const key = JSON.parse(`"${lastString}"`) as string;
        if (frame.keys.has(key)) {
          throw new TypeError(`Duplicate JSON property: ${key}`);
        }
        frame.keys.add(key);
      }
      lastString = null;
      continue;
    }
    if (!/\s/u.test(char)) {
      lastString = null;
    }
  }
}
