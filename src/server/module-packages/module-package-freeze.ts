import "server-only";

export function deepFreezeModulePackageResult<T extends object>(value: T): T {
  const stack: object[] = [value];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") {
        stack.push(nested);
      }
    }
    Object.freeze(current);
  }

  return value;
}
