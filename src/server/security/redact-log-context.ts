import "server-only";

const SENSITIVE_FIELD_PATTERN =
  /api[_-]?key|authorization|cookie|credential|password|passwd|private[_-]?key|secret|session|token/i;

const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 500;

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}[TRUNCATED]`
      : value;
  }

  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "undefined"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      message: "Unexpected error",
      name: value.name,
    };
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_FIELD_PATTERN.test(key) ? "[REDACTED]" : sanitizeValue(item, depth + 1, seen),
    ]),
  );
}

export function redactLogContext(
  context: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return sanitizeValue(context, 0, new WeakSet()) as Readonly<Record<string, unknown>>;
}

export function redactLogMessage(message: string): string {
  return message
    .replace(
      /\b(api[_-]?key|authorization|cookie|credential|password|passwd|private[_-]?key|secret|session|token)\s*[:=]\s*\S+/gi,
      "$1=[REDACTED]",
    )
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, MAX_STRING_LENGTH);
}
