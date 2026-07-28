export type CatalogSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function getCatalogSearchParams(searchParams?: CatalogSearchParams) {
  return searchParams ? await searchParams : {};
}

export function paramValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}
