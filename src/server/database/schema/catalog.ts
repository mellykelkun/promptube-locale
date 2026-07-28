import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const now = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedNow = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const catalogCategories = pgTable(
  "catalog_categories",
  {
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: now,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    description: text("description"),
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    revision: integer("revision").notNull().default(1),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: updatedNow,
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check(
      "catalog_categories_name_length_check",
      sql`char_length(${table.name}) between 2 and 120`,
    ),
    check(
      "catalog_categories_slug_length_check",
      sql`char_length(${table.slug}) between 2 and 160`,
    ),
    check(
      "catalog_categories_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_categories_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 1000`,
    ),
    check(
      "catalog_categories_sort_order_check",
      sql`${table.sortOrder} between -100000 and 100000`,
    ),
    check("catalog_categories_revision_positive_check", sql`${table.revision} >= 1`),
    uniqueIndex("catalog_categories_slug_unique").on(table.slug),
    index("catalog_categories_archived_at_idx").on(table.archivedAt),
    index("catalog_categories_sort_idx").on(table.sortOrder, table.name),
  ],
);

export const catalogSubcategories = pgTable(
  "catalog_subcategories",
  {
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategories.id, { onDelete: "restrict" }),
    createdAt: now,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    description: text("description"),
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    revision: integer("revision").notNull().default(1),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: updatedNow,
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check(
      "catalog_subcategories_name_length_check",
      sql`char_length(${table.name}) between 2 and 120`,
    ),
    check(
      "catalog_subcategories_slug_length_check",
      sql`char_length(${table.slug}) between 2 and 160`,
    ),
    check(
      "catalog_subcategories_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "catalog_subcategories_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 1000`,
    ),
    check(
      "catalog_subcategories_sort_order_check",
      sql`${table.sortOrder} between -100000 and 100000`,
    ),
    check("catalog_subcategories_revision_positive_check", sql`${table.revision} >= 1`),
    uniqueIndex("catalog_subcategories_category_slug_unique").on(table.categoryId, table.slug),
    index("catalog_subcategories_category_idx").on(table.categoryId),
    index("catalog_subcategories_archived_at_idx").on(table.archivedAt),
    index("catalog_subcategories_sort_idx").on(table.categoryId, table.sortOrder, table.name),
  ],
);

export const catalogModules = pgTable(
  "catalog_modules",
  {
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: now,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    id: uuid("id").primaryKey(),
    locale: text("locale").notNull(),
    revision: integer("revision").notNull().default(1),
    slug: text("slug").notNull(),
    subcategoryId: uuid("subcategory_id")
      .notNull()
      .references(() => catalogSubcategories.id, { onDelete: "restrict" }),
    summary: text("summary").notNull(),
    title: text("title").notNull(),
    updatedAt: updatedNow,
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("catalog_modules_title_length_check", sql`char_length(${table.title}) between 2 and 180`),
    check("catalog_modules_slug_length_check", sql`char_length(${table.slug}) between 2 and 160`),
    check("catalog_modules_slug_format_check", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check(
      "catalog_modules_summary_length_check",
      sql`char_length(${table.summary}) between 1 and 500`,
    ),
    check("catalog_modules_locale_format_check", sql`${table.locale} ~ '^[a-z]{2}(?:-[A-Z]{2})?$'`),
    check("catalog_modules_revision_positive_check", sql`${table.revision} >= 1`),
    uniqueIndex("catalog_modules_slug_unique").on(table.slug),
    index("catalog_modules_subcategory_idx").on(table.subcategoryId),
    index("catalog_modules_archived_at_idx").on(table.archivedAt),
    index("catalog_modules_updated_at_idx").on(table.updatedAt),
  ],
);

export const catalogModuleVersions = pgTable(
  "catalog_module_versions",
  {
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by").references(() => user.id, { onDelete: "restrict" }),
    changelog: text("changelog"),
    contentMarkdown: text("content_markdown").notNull(),
    createdAt: now,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    id: uuid("id").primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => catalogModules.id, { onDelete: "restrict" }),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull().default(1),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    updatedAt: updatedNow,
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    workflowStatus: text("workflow_status").notNull().default("DRAFT"),
  },
  (table) => [
    check("catalog_module_versions_number_check", sql`${table.versionNumber} >= 1`),
    check("catalog_module_versions_revision_positive_check", sql`${table.revision} >= 1`),
    check(
      "catalog_module_versions_status_check",
      sql`${table.workflowStatus} in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED')`,
    ),
    check(
      "catalog_module_versions_content_length_check",
      sql`char_length(${table.contentMarkdown}) between 1 and 50000`,
    ),
    check(
      "catalog_module_versions_changelog_length_check",
      sql`${table.changelog} is null or char_length(${table.changelog}) <= 2000`,
    ),
    uniqueIndex("catalog_module_versions_module_number_unique").on(
      table.moduleId,
      table.versionNumber,
    ),
    uniqueIndex("catalog_module_versions_one_mutable_per_module_idx")
      .on(table.moduleId)
      .where(sql`${table.workflowStatus} in ('DRAFT', 'IN_REVIEW')`),
    uniqueIndex("catalog_module_versions_one_approved_per_module_idx")
      .on(table.moduleId)
      .where(sql`${table.workflowStatus} = 'APPROVED'`),
    index("catalog_module_versions_module_idx").on(table.moduleId),
    index("catalog_module_versions_status_idx").on(table.workflowStatus),
    index("catalog_module_versions_updated_at_idx").on(table.updatedAt),
  ],
);
