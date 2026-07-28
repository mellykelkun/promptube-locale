import "server-only";

import { z } from "zod";

import { catalogWorkflowStatuses } from "./catalog-types";

const controlCharacterPattern = /[\u0000-\u001F\u007F]/;
const unsafeMultilineControlCharacterPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function rejectControlCharacters(value: string): boolean {
  return !controlCharacterPattern.test(value);
}

function rejectUnsafeMultilineControlCharacters(value: string): boolean {
  return !unsafeMultilineControlCharacterPattern.test(value);
}

export function normalizeCatalogSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export const catalogSlugSchema = z
  .string()
  .min(2)
  .max(160)
  .regex(slugPattern)
  .refine(rejectControlCharacters);

export const catalogNameSchema = z.string().min(2).max(120).refine(rejectControlCharacters);
export const catalogTitleSchema = z.string().min(2).max(180).refine(rejectControlCharacters);
export const catalogSummarySchema = z.string().min(1).max(500).refine(rejectControlCharacters);
export const catalogDescriptionSchema = z
  .string()
  .max(1000)
  .refine(rejectUnsafeMultilineControlCharacters)
  .nullish()
  .transform((value) => value ?? null);
export const catalogMarkdownSchema = z
  .string()
  .min(1)
  .max(50000)
  .refine(rejectUnsafeMultilineControlCharacters);
export const catalogChangelogSchema = z
  .string()
  .max(2000)
  .refine(rejectUnsafeMultilineControlCharacters)
  .nullish()
  .transform((value) => value ?? null);
export const catalogLocaleSchema = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/);
export const catalogSortOrderSchema = z.coerce.number().int().min(-100000).max(100000);
export const catalogRevisionSchema = z.coerce.number().int().min(1);
export const catalogUuidSchema = z.uuid();
export const catalogWorkflowStatusSchema = z.enum(catalogWorkflowStatuses);

export const catalogListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["active", "all", "archived"]).default("active"),
});

export const createCategorySchema = z.object({
  description: catalogDescriptionSchema,
  name: catalogNameSchema,
  slug: catalogSlugSchema,
  sortOrder: catalogSortOrderSchema,
});

export const updateCategorySchema = createCategorySchema.extend({
  expectedRevision: catalogRevisionSchema,
  id: catalogUuidSchema,
});

export const createSubcategorySchema = createCategorySchema.extend({
  categoryId: catalogUuidSchema,
});

export const updateSubcategorySchema = createSubcategorySchema.extend({
  expectedRevision: catalogRevisionSchema,
  id: catalogUuidSchema,
});

export const createModuleSchema = z.object({
  contentMarkdown: catalogMarkdownSchema.default("Brouillon initial."),
  locale: catalogLocaleSchema.default("fr"),
  slug: catalogSlugSchema,
  subcategoryId: catalogUuidSchema,
  summary: catalogSummarySchema,
  title: catalogTitleSchema,
});

export const updateModuleSchema = createModuleSchema.omit({ contentMarkdown: true }).extend({
  expectedRevision: catalogRevisionSchema,
  id: catalogUuidSchema,
});

export const updateModuleVersionSchema = z.object({
  changelog: catalogChangelogSchema,
  contentMarkdown: catalogMarkdownSchema,
  expectedRevision: catalogRevisionSchema,
  id: catalogUuidSchema,
});

export const transitionModuleVersionSchema = z.object({
  expectedRevision: catalogRevisionSchema,
  id: catalogUuidSchema,
});

export const archiveEntitySchema = z.object({
  expectedRevision: catalogRevisionSchema,
  id: catalogUuidSchema,
});

export function parseOptionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value.length === 0 ? null : value;
}

export function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
