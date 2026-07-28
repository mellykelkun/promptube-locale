import "server-only";

import { randomUUID } from "node:crypto";

import type { PoolClient, QueryResultRow } from "pg";

import { auditActions } from "@/server/audit/audit-events";
import { getPostgresPool } from "@/server/database/client";
import { redactLogContext } from "@/server/security/redact-log-context";

import { CatalogError, catalogErrorCodes } from "./catalog-errors";

import type {
  CatalogActor,
  CatalogCategoryDto,
  CatalogListFilters,
  CatalogModuleDto,
  CatalogModuleVersionDto,
  CatalogPage,
  CatalogSubcategoryDto,
  CatalogWorkflowStatus,
} from "./catalog-types";

type CategoryInput = {
  description: null | string;
  name: string;
  slug: string;
  sortOrder: number;
};

type SubcategoryInput = CategoryInput & {
  categoryId: string;
};

type ModuleInput = {
  locale: string;
  slug: string;
  subcategoryId: string;
  summary: string;
  title: string;
};

type CreateModuleInput = ModuleInput & {
  contentMarkdown: string;
};

type VersionInput = {
  changelog: null | string;
  contentMarkdown: string;
};

type RevisionInput = {
  expectedRevision: number;
  id: string;
};

type AuditInput = {
  action: (typeof auditActions)[keyof typeof auditActions];
  actorUserId: string;
  metadata?: Record<string, unknown>;
  outcome?: "failure" | "success";
  targetId?: null | string;
  targetType: string;
};

class CatalogConflictAuditError extends CatalogError {
  readonly actorUserId: string;
  readonly expectedRevision: number;
  readonly targetId: string;
  readonly targetType: string;

  constructor(input: {
    actorUserId: string;
    expectedRevision: number;
    targetId: string;
    targetType: string;
  }) {
    super(catalogErrorCodes.staleRevision, 409);
    this.actorUserId = input.actorUserId;
    this.expectedRevision = input.expectedRevision;
    this.targetId = input.targetId;
    this.targetType = input.targetType;
  }
}

async function withCatalogTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    const mappedError = mapPgError(error);
    if (mappedError instanceof CatalogConflictAuditError) {
      await auditConflict(mappedError);
    }
    throw mappedError;
  } finally {
    client.release();
  }
}

function mapPgError(error: unknown): unknown {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    return new CatalogError(catalogErrorCodes.slugConflict, 409);
  }

  return error;
}

async function insertAudit(client: PoolClient, input: AuditInput): Promise<void> {
  await client.query(
    `
      insert into admin_audit_events (
        id,
        actor_user_id,
        action,
        outcome,
        target_type,
        target_id,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      randomUUID(),
      input.actorUserId,
      input.action,
      input.outcome ?? "success",
      input.targetType,
      input.targetId ?? null,
      JSON.stringify(redactLogContext(input.metadata ?? {})),
    ],
  );
}

function totalFromRow(row: QueryResultRow | undefined): number {
  return Number(row?.total_count ?? 0);
}

function mapCategory(row: QueryResultRow): CatalogCategoryDto {
  return {
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    name: row.name,
    revision: row.revision,
    slug: row.slug,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

function mapSubcategory(row: QueryResultRow): CatalogSubcategoryDto {
  return {
    ...mapCategory(row),
    categoryId: row.category_id,
    categoryName: row.category_name,
  };
}

function mapModule(row: QueryResultRow): CatalogModuleDto {
  return {
    archivedAt: row.archived_at,
    categoryName: row.category_name,
    createdAt: row.created_at,
    id: row.id,
    latestStatus: row.latest_status,
    locale: row.locale,
    revision: row.revision,
    slug: row.slug,
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategory_name,
    summary: row.summary,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapVersion(row: QueryResultRow): CatalogModuleVersionDto {
  return {
    approvedAt: row.approved_at,
    changelog: row.changelog,
    contentMarkdown: row.content_markdown,
    createdAt: row.created_at,
    id: row.id,
    moduleId: row.module_id,
    revision: row.revision,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    versionNumber: row.version_number,
    workflowStatus: row.workflow_status,
  };
}

function offset(filters: CatalogListFilters): number {
  return (filters.page - 1) * filters.pageSize;
}

export async function listCatalogCategories(
  filters: CatalogListFilters,
): Promise<CatalogPage<CatalogCategoryDto>> {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      select *,
        count(*) over()::int as total_count
      from catalog_categories
      where
        ($1::text is null or name ilike '%' || $1 || '%' or slug ilike '%' || $1 || '%')
        and (
          $4::text = 'all'
          or ($4::text = 'active' and archived_at is null)
          or ($4::text = 'archived' and archived_at is not null)
        )
      order by sort_order asc, name asc, id asc
      limit $2 offset $3
    `,
    [filters.search || null, filters.pageSize, offset(filters), filters.status ?? "active"],
  );

  return {
    items: result.rows.map(mapCategory),
    page: filters.page,
    pageSize: filters.pageSize,
    total: totalFromRow(result.rows[0]),
  };
}

export async function getCatalogCategory(id: string): Promise<CatalogCategoryDto> {
  const pool = await getPostgresPool();
  const result = await pool.query("select * from catalog_categories where id = $1", [id]);

  if (result.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.categoryNotFound, 404);
  }

  return mapCategory(result.rows[0]);
}

export async function listCatalogSubcategories(
  filters: CatalogListFilters & { categoryId?: string },
): Promise<CatalogPage<CatalogSubcategoryDto>> {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      select s.*, c.name as category_name,
        count(*) over()::int as total_count
      from catalog_subcategories s
      inner join catalog_categories c on c.id = s.category_id
      where
        ($1::text is null or s.name ilike '%' || $1 || '%' or s.slug ilike '%' || $1 || '%' or c.name ilike '%' || $1 || '%')
        and ($5::uuid is null or s.category_id = $5::uuid)
        and (
          $4::text = 'all'
          or ($4::text = 'active' and s.archived_at is null)
          or ($4::text = 'archived' and s.archived_at is not null)
        )
      order by c.sort_order asc, c.name asc, s.sort_order asc, s.name asc, s.id asc
      limit $2 offset $3
    `,
    [
      filters.search || null,
      filters.pageSize,
      offset(filters),
      filters.status ?? "active",
      filters.categoryId ?? null,
    ],
  );

  return {
    items: result.rows.map(mapSubcategory),
    page: filters.page,
    pageSize: filters.pageSize,
    total: totalFromRow(result.rows[0]),
  };
}

export async function getCatalogSubcategory(id: string): Promise<CatalogSubcategoryDto> {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      select s.*, c.name as category_name
      from catalog_subcategories s
      inner join catalog_categories c on c.id = s.category_id
      where s.id = $1
    `,
    [id],
  );

  if (result.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.subcategoryNotFound, 404);
  }

  return mapSubcategory(result.rows[0]);
}

export async function listCatalogModules(
  filters: CatalogListFilters & {
    locale?: string;
    subcategoryId?: string;
    workflowStatus?: string;
  },
): Promise<CatalogPage<CatalogModuleDto>> {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      select m.*, s.name as subcategory_name, c.name as category_name, latest.workflow_status as latest_status,
        count(*) over()::int as total_count
      from catalog_modules m
      inner join catalog_subcategories s on s.id = m.subcategory_id
      inner join catalog_categories c on c.id = s.category_id
      left join lateral (
        select workflow_status
        from catalog_module_versions v
        where v.module_id = m.id
        order by v.version_number desc
        limit 1
      ) latest on true
      where
        ($1::text is null or m.title ilike '%' || $1 || '%' or m.slug ilike '%' || $1 || '%' or m.summary ilike '%' || $1 || '%' or s.name ilike '%' || $1 || '%' or c.name ilike '%' || $1 || '%')
        and ($5::uuid is null or m.subcategory_id = $5::uuid)
        and ($6::text is null or m.locale = $6::text)
        and ($7::text is null or latest.workflow_status = $7::text)
        and (
          $4::text = 'all'
          or ($4::text = 'active' and m.archived_at is null)
          or ($4::text = 'archived' and m.archived_at is not null)
        )
      order by m.updated_at desc, m.title asc, m.id asc
      limit $2 offset $3
    `,
    [
      filters.search || null,
      filters.pageSize,
      offset(filters),
      filters.status ?? "active",
      filters.subcategoryId ?? null,
      filters.locale ?? null,
      filters.workflowStatus ?? null,
    ],
  );

  return {
    items: result.rows.map(mapModule),
    page: filters.page,
    pageSize: filters.pageSize,
    total: totalFromRow(result.rows[0]),
  };
}

export async function getCatalogModule(id: string): Promise<{
  module: CatalogModuleDto;
  versions: CatalogModuleVersionDto[];
}> {
  const pool = await getPostgresPool();
  const moduleResult = await pool.query(
    `
      select m.*, s.name as subcategory_name, c.name as category_name, latest.workflow_status as latest_status
      from catalog_modules m
      inner join catalog_subcategories s on s.id = m.subcategory_id
      inner join catalog_categories c on c.id = s.category_id
      left join lateral (
        select workflow_status
        from catalog_module_versions v
        where v.module_id = m.id
        order by v.version_number desc
        limit 1
      ) latest on true
      where m.id = $1
    `,
    [id],
  );

  if (moduleResult.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.moduleNotFound, 404);
  }

  const versionsResult = await pool.query(
    `
      select *
      from catalog_module_versions
      where module_id = $1
      order by version_number desc
    `,
    [id],
  );

  return {
    module: mapModule(moduleResult.rows[0]),
    versions: versionsResult.rows.map(mapVersion),
  };
}

export async function getCatalogModuleVersion(id: string): Promise<{
  module: CatalogModuleDto;
  version: CatalogModuleVersionDto;
}> {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      select v.*, m.title, m.slug, m.locale, m.summary, m.subcategory_id, m.archived_at as module_archived_at,
        m.created_at as module_created_at, m.updated_at as module_updated_at, m.revision as module_revision,
        s.name as subcategory_name, c.name as category_name
      from catalog_module_versions v
      inner join catalog_modules m on m.id = v.module_id
      inner join catalog_subcategories s on s.id = m.subcategory_id
      inner join catalog_categories c on c.id = s.category_id
      where v.id = $1
    `,
    [id],
  );

  if (result.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.versionNotFound, 404);
  }

  const row = result.rows[0];

  return {
    module: {
      archivedAt: row.module_archived_at,
      categoryName: row.category_name,
      createdAt: row.module_created_at,
      id: row.module_id,
      latestStatus: row.workflow_status,
      locale: row.locale,
      revision: row.module_revision,
      slug: row.slug,
      subcategoryId: row.subcategory_id,
      subcategoryName: row.subcategory_name,
      summary: row.summary,
      title: row.title,
      updatedAt: row.module_updated_at,
    },
    version: mapVersion(row),
  };
}

export async function createCatalogCategory(
  actor: CatalogActor,
  input: CategoryInput,
): Promise<string> {
  return withCatalogTransaction(async (client) => {
    const id = randomUUID();
    await client.query(
      `
        insert into catalog_categories
          (id, name, slug, description, sort_order, created_by, updated_by)
        values ($1, $2, $3, $4, $5, $6, $6)
      `,
      [id, input.name, input.slug, input.description, input.sortOrder, actor.id],
    );
    await insertAudit(client, {
      action: auditActions.catalogCategoryCreated,
      actorUserId: actor.id,
      metadata: { slug: input.slug },
      targetId: id,
      targetType: "catalog_category",
    });
    return id;
  });
}

export async function updateCatalogCategory(
  actor: CatalogActor,
  input: CategoryInput & RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const result = await client.query(
      `
        update catalog_categories
        set name = $2,
            slug = $3,
            description = $4,
            sort_order = $5,
            updated_by = $6,
            updated_at = now(),
            revision = revision + 1
        where id = $1 and revision = $7
        returning revision
      `,
      [
        input.id,
        input.name,
        input.slug,
        input.description,
        input.sortOrder,
        actor.id,
        input.expectedRevision,
      ],
    );

    await assertUpdated(client, result.rowCount, {
      actor,
      entity: "category",
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_categories",
      targetType: "catalog_category",
    });
    await insertAudit(client, {
      action: auditActions.catalogCategoryUpdated,
      actorUserId: actor.id,
      metadata: {
        fields: ["name", "slug", "description", "sortOrder"],
        nextRevision: result.rows[0].revision,
        previousRevision: input.expectedRevision,
      },
      targetId: input.id,
      targetType: "catalog_category",
    });
  });
}

export async function archiveCatalogCategory(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const children = await client.query(
      "select 1 from catalog_subcategories where category_id = $1 and archived_at is null limit 1",
      [input.id],
    );
    if ((children.rowCount ?? 0) > 0) {
      throw new CatalogError(catalogErrorCodes.activeChildrenExist, 409);
    }

    await archiveByRevision(client, {
      action: auditActions.catalogCategoryArchived,
      actor,
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_categories",
      type: "catalog_category",
    });
  });
}

export async function restoreCatalogCategory(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await restoreByRevision(clientless(actor), {
    action: auditActions.catalogCategoryRestored,
    expectedRevision: input.expectedRevision,
    id: input.id,
    table: "catalog_categories",
    type: "catalog_category",
  });
}

function clientless(actor: CatalogActor) {
  return { actor };
}

export async function createCatalogSubcategory(
  actor: CatalogActor,
  input: SubcategoryInput,
): Promise<string> {
  return withCatalogTransaction(async (client) => {
    await ensureCategoryActive(client, input.categoryId);
    const id = randomUUID();
    await client.query(
      `
        insert into catalog_subcategories
          (id, category_id, name, slug, description, sort_order, created_by, updated_by)
        values ($1, $2, $3, $4, $5, $6, $7, $7)
      `,
      [id, input.categoryId, input.name, input.slug, input.description, input.sortOrder, actor.id],
    );
    await insertAudit(client, {
      action: auditActions.catalogSubcategoryCreated,
      actorUserId: actor.id,
      metadata: { categoryId: input.categoryId, slug: input.slug },
      targetId: id,
      targetType: "catalog_subcategory",
    });
    return id;
  });
}

export async function updateCatalogSubcategory(
  actor: CatalogActor,
  input: SubcategoryInput & RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    await ensureCategoryActive(client, input.categoryId);
    const result = await client.query(
      `
        update catalog_subcategories
        set category_id = $2,
            name = $3,
            slug = $4,
            description = $5,
            sort_order = $6,
            updated_by = $7,
            updated_at = now(),
            revision = revision + 1
        where id = $1 and revision = $8
        returning revision
      `,
      [
        input.id,
        input.categoryId,
        input.name,
        input.slug,
        input.description,
        input.sortOrder,
        actor.id,
        input.expectedRevision,
      ],
    );

    await assertUpdated(client, result.rowCount, {
      actor,
      entity: "subcategory",
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_subcategories",
      targetType: "catalog_subcategory",
    });
    await insertAudit(client, {
      action: auditActions.catalogSubcategoryUpdated,
      actorUserId: actor.id,
      metadata: {
        fields: ["categoryId", "name", "slug", "description", "sortOrder"],
        nextRevision: result.rows[0].revision,
        previousRevision: input.expectedRevision,
      },
      targetId: input.id,
      targetType: "catalog_subcategory",
    });
  });
}

export async function archiveCatalogSubcategory(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const children = await client.query(
      "select 1 from catalog_modules where subcategory_id = $1 and archived_at is null limit 1",
      [input.id],
    );
    if ((children.rowCount ?? 0) > 0) {
      throw new CatalogError(catalogErrorCodes.activeChildrenExist, 409);
    }

    await archiveByRevision(client, {
      action: auditActions.catalogSubcategoryArchived,
      actor,
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_subcategories",
      type: "catalog_subcategory",
    });
  });
}

export async function restoreCatalogSubcategory(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const parent = await client.query(
      `
        select c.archived_at
        from catalog_subcategories s
        inner join catalog_categories c on c.id = s.category_id
        where s.id = $1
      `,
      [input.id],
    );
    if (parent.rowCount === 0) {
      throw new CatalogError(catalogErrorCodes.subcategoryNotFound, 404);
    }
    if (parent.rows[0].archived_at) {
      throw new CatalogError(catalogErrorCodes.parentArchived, 409);
    }

    await restoreByRevisionInClient(client, {
      action: auditActions.catalogSubcategoryRestored,
      actor,
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_subcategories",
      type: "catalog_subcategory",
    });
  });
}

export async function createCatalogModule(
  actor: CatalogActor,
  input: CreateModuleInput,
): Promise<string> {
  return withCatalogTransaction(async (client) => {
    await ensureSubcategoryActive(client, input.subcategoryId);
    const id = randomUUID();
    const versionId = randomUUID();
    await client.query(
      `
        insert into catalog_modules
          (id, subcategory_id, title, slug, summary, locale, created_by, updated_by)
        values ($1, $2, $3, $4, $5, $6, $7, $7)
      `,
      [id, input.subcategoryId, input.title, input.slug, input.summary, input.locale, actor.id],
    );
    await client.query(
      `
        insert into catalog_module_versions
          (id, module_id, version_number, workflow_status, content_markdown, created_by, updated_by)
        values ($1, $2, 1, 'DRAFT', $3, $4, $4)
      `,
      [versionId, id, input.contentMarkdown, actor.id],
    );
    await insertAudit(client, {
      action: auditActions.catalogModuleCreated,
      actorUserId: actor.id,
      metadata: { locale: input.locale, slug: input.slug, subcategoryId: input.subcategoryId },
      targetId: id,
      targetType: "catalog_module",
    });
    await insertAudit(client, {
      action: auditActions.catalogVersionCreated,
      actorUserId: actor.id,
      metadata: { moduleId: id, versionNumber: 1 },
      targetId: versionId,
      targetType: "catalog_module_version",
    });
    return id;
  });
}

export async function updateCatalogModule(
  actor: CatalogActor,
  input: ModuleInput & RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    await ensureSubcategoryActive(client, input.subcategoryId);
    const result = await client.query(
      `
        update catalog_modules
        set subcategory_id = $2,
            title = $3,
            slug = $4,
            summary = $5,
            locale = $6,
            updated_by = $7,
            updated_at = now(),
            revision = revision + 1
        where id = $1 and revision = $8
        returning revision
      `,
      [
        input.id,
        input.subcategoryId,
        input.title,
        input.slug,
        input.summary,
        input.locale,
        actor.id,
        input.expectedRevision,
      ],
    );

    await assertUpdated(client, result.rowCount, {
      actor,
      entity: "module",
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_modules",
      targetType: "catalog_module",
    });
    await insertAudit(client, {
      action: auditActions.catalogModuleUpdated,
      actorUserId: actor.id,
      metadata: {
        fields: ["subcategoryId", "title", "slug", "summary", "locale"],
        nextRevision: result.rows[0].revision,
        previousRevision: input.expectedRevision,
      },
      targetId: input.id,
      targetType: "catalog_module",
    });
  });
}

export async function archiveCatalogModule(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const inReview = await client.query(
      "select 1 from catalog_module_versions where module_id = $1 and workflow_status = 'IN_REVIEW' limit 1",
      [input.id],
    );
    if ((inReview.rowCount ?? 0) > 0) {
      throw new CatalogError(catalogErrorCodes.invalidTransition, 409);
    }

    await archiveByRevision(client, {
      action: auditActions.catalogModuleArchived,
      actor,
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_modules",
      type: "catalog_module",
    });
  });
}

export async function restoreCatalogModule(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const parent = await client.query(
      `
        select s.archived_at as subcategory_archived_at, c.archived_at as category_archived_at
        from catalog_modules m
        inner join catalog_subcategories s on s.id = m.subcategory_id
        inner join catalog_categories c on c.id = s.category_id
        where m.id = $1
      `,
      [input.id],
    );
    if (parent.rowCount === 0) {
      throw new CatalogError(catalogErrorCodes.moduleNotFound, 404);
    }
    if (parent.rows[0].subcategory_archived_at || parent.rows[0].category_archived_at) {
      throw new CatalogError(catalogErrorCodes.parentArchived, 409);
    }

    await restoreByRevisionInClient(client, {
      action: auditActions.catalogModuleRestored,
      actor,
      expectedRevision: input.expectedRevision,
      id: input.id,
      table: "catalog_modules",
      type: "catalog_module",
    });
  });
}

export async function updateCatalogModuleVersion(
  actor: CatalogActor,
  input: VersionInput & RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const current = await selectVersionForUpdate(client, input.id);
    assertVersionMutable(current.workflow_status);

    const result = await client.query(
      `
        update catalog_module_versions
        set content_markdown = $2,
            changelog = $3,
            updated_by = $4,
            updated_at = now(),
            revision = revision + 1
        where id = $1 and revision = $5
        returning revision
      `,
      [input.id, input.contentMarkdown, input.changelog, actor.id, input.expectedRevision],
    );
    if (result.rowCount === 0) {
      throw new CatalogConflictAuditError({
        actorUserId: actor.id,
        expectedRevision: input.expectedRevision,
        targetId: input.id,
        targetType: "catalog_module_version",
      });
    }

    await insertAudit(client, {
      action: auditActions.catalogVersionUpdated,
      actorUserId: actor.id,
      metadata: {
        fields: ["contentMarkdown", "changelog"],
        nextRevision: result.rows[0].revision,
        previousRevision: input.expectedRevision,
      },
      targetId: input.id,
      targetType: "catalog_module_version",
    });
  });
}

export async function submitCatalogModuleVersion(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await transitionVersion(actor, input, "DRAFT", "IN_REVIEW", auditActions.catalogVersionSubmitted);
}

export async function returnCatalogModuleVersionToDraft(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await transitionVersion(
    actor,
    input,
    "IN_REVIEW",
    "DRAFT",
    auditActions.catalogVersionReturnedToDraft,
  );
}

export async function approveCatalogModuleVersion(
  actor: CatalogActor,
  input: RevisionInput,
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const current = await selectVersionForUpdate(client, input.id);
    if (current.workflow_status !== "IN_REVIEW") {
      throw new CatalogError(catalogErrorCodes.invalidTransition, 409);
    }
    if (current.revision !== input.expectedRevision) {
      throw new CatalogConflictAuditError({
        actorUserId: actor.id,
        expectedRevision: input.expectedRevision,
        targetId: input.id,
        targetType: "catalog_module_version",
      });
    }

    const superseded = await client.query(
      `
        update catalog_module_versions
        set workflow_status = 'SUPERSEDED',
            updated_by = $2,
            updated_at = now(),
            revision = revision + 1
        where module_id = $1 and workflow_status = 'APPROVED'
        returning id, version_number
      `,
      [current.module_id, actor.id],
    );

    for (const row of superseded.rows) {
      await insertAudit(client, {
        action: auditActions.catalogVersionSuperseded,
        actorUserId: actor.id,
        metadata: { moduleId: current.module_id, versionNumber: row.version_number },
        targetId: row.id,
        targetType: "catalog_module_version",
      });
    }

    const result = await client.query(
      `
        update catalog_module_versions
        set workflow_status = 'APPROVED',
            approved_by = $2,
            approved_at = now(),
            updated_by = $2,
            updated_at = now(),
            revision = revision + 1
        where id = $1
        returning revision, version_number
      `,
      [input.id, actor.id],
    );

    await insertAudit(client, {
      action: auditActions.catalogVersionApproved,
      actorUserId: actor.id,
      metadata: {
        moduleId: current.module_id,
        nextRevision: result.rows[0].revision,
        previousRevision: input.expectedRevision,
        versionNumber: result.rows[0].version_number,
      },
      targetId: input.id,
      targetType: "catalog_module_version",
    });
  });
}

export async function createNextCatalogModuleVersion(
  actor: CatalogActor,
  approvedVersionId: string,
): Promise<string> {
  return withCatalogTransaction(async (client) => {
    const approved = await selectVersionForUpdate(client, approvedVersionId);
    if (approved.workflow_status !== "APPROVED") {
      throw new CatalogError(catalogErrorCodes.invalidTransition, 409);
    }

    const mutable = await client.query(
      "select 1 from catalog_module_versions where module_id = $1 and workflow_status in ('DRAFT', 'IN_REVIEW') limit 1",
      [approved.module_id],
    );
    if ((mutable.rowCount ?? 0) > 0) {
      throw new CatalogError(catalogErrorCodes.invalidTransition, 409);
    }

    const next = await client.query(
      "select coalesce(max(version_number), 0)::int + 1 as next_number from catalog_module_versions where module_id = $1",
      [approved.module_id],
    );
    const versionNumber = Number(next.rows[0].next_number);
    const id = randomUUID();

    await client.query(
      `
        insert into catalog_module_versions
          (id, module_id, version_number, workflow_status, content_markdown, changelog, created_by, updated_by)
        values ($1, $2, $3, 'DRAFT', $4, $5, $6, $6)
      `,
      [
        id,
        approved.module_id,
        versionNumber,
        approved.content_markdown,
        approved.changelog,
        actor.id,
      ],
    );

    await insertAudit(client, {
      action: auditActions.catalogVersionCreated,
      actorUserId: actor.id,
      metadata: {
        copiedFromVersionId: approvedVersionId,
        moduleId: approved.module_id,
        versionNumber,
      },
      targetId: id,
      targetType: "catalog_module_version",
    });

    return id;
  });
}

async function transitionVersion(
  actor: CatalogActor,
  input: RevisionInput,
  from: CatalogWorkflowStatus,
  to: CatalogWorkflowStatus,
  action: (typeof auditActions)[keyof typeof auditActions],
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    const current = await selectVersionForUpdate(client, input.id);
    if (current.workflow_status !== from) {
      throw new CatalogError(catalogErrorCodes.invalidTransition, 409);
    }

    const result = await client.query(
      `
        update catalog_module_versions
        set workflow_status = $2,
            submitted_at = case when $2 = 'IN_REVIEW' then now() else null end,
            reviewed_by = case when $2 = 'DRAFT' then $3 else reviewed_by end,
            updated_by = $3,
            updated_at = now(),
            revision = revision + 1
        where id = $1 and revision = $4
        returning revision
      `,
      [input.id, to, actor.id, input.expectedRevision],
    );
    if (result.rowCount === 0) {
      throw new CatalogConflictAuditError({
        actorUserId: actor.id,
        expectedRevision: input.expectedRevision,
        targetId: input.id,
        targetType: "catalog_module_version",
      });
    }

    await insertAudit(client, {
      action,
      actorUserId: actor.id,
      metadata: {
        from,
        nextRevision: result.rows[0].revision,
        previousRevision: input.expectedRevision,
        to,
      },
      targetId: input.id,
      targetType: "catalog_module_version",
    });
  });
}

async function ensureCategoryActive(client: PoolClient, categoryId: string): Promise<void> {
  const result = await client.query("select archived_at from catalog_categories where id = $1", [
    categoryId,
  ]);
  if (result.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.categoryNotFound, 404);
  }
  if (result.rows[0].archived_at) {
    throw new CatalogError(catalogErrorCodes.parentArchived, 409);
  }
}

async function ensureSubcategoryActive(client: PoolClient, subcategoryId: string): Promise<void> {
  const result = await client.query(
    `
      select s.archived_at as subcategory_archived_at, c.archived_at as category_archived_at
      from catalog_subcategories s
      inner join catalog_categories c on c.id = s.category_id
      where s.id = $1
    `,
    [subcategoryId],
  );
  if (result.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.subcategoryNotFound, 404);
  }
  if (result.rows[0].subcategory_archived_at || result.rows[0].category_archived_at) {
    throw new CatalogError(catalogErrorCodes.parentArchived, 409);
  }
}

async function selectVersionForUpdate(
  client: PoolClient,
  versionId: string,
): Promise<QueryResultRow> {
  const result = await client.query(
    "select * from catalog_module_versions where id = $1 for update",
    [versionId],
  );
  if (result.rowCount === 0) {
    throw new CatalogError(catalogErrorCodes.versionNotFound, 404);
  }
  return result.rows[0];
}

function assertVersionMutable(status: CatalogWorkflowStatus): void {
  if (status === "APPROVED") {
    throw new CatalogError(catalogErrorCodes.approvedVersionImmutable, 409);
  }
  if (status === "SUPERSEDED") {
    throw new CatalogError(catalogErrorCodes.supersededVersionImmutable, 409);
  }
  if (status !== "DRAFT") {
    throw new CatalogError(catalogErrorCodes.invalidTransition, 409);
  }
}

async function assertUpdated(
  client: PoolClient,
  rowCount: number | null,
  input: {
    actor: CatalogActor;
    entity: "category" | "module" | "subcategory";
    expectedRevision: number;
    id: string;
    table: string;
    targetType: string;
  },
): Promise<void> {
  if ((rowCount ?? 0) > 0) {
    return;
  }

  const exists = await client.query(`select 1 from ${input.table} where id = $1 limit 1`, [
    input.id,
  ]);
  if (exists.rowCount === 0) {
    const code =
      input.entity === "category"
        ? catalogErrorCodes.categoryNotFound
        : input.entity === "subcategory"
          ? catalogErrorCodes.subcategoryNotFound
          : catalogErrorCodes.moduleNotFound;
    throw new CatalogError(code, 404);
  }

  throw new CatalogConflictAuditError({
    actorUserId: input.actor.id,
    expectedRevision: input.expectedRevision,
    targetId: input.id,
    targetType: input.targetType,
  });
}

async function auditConflict(error: CatalogConflictAuditError): Promise<void> {
  const pool = await getPostgresPool();
  await pool.query(
    `
      insert into admin_audit_events (
        id,
        actor_user_id,
        action,
        outcome,
        target_type,
        target_id,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      randomUUID(),
      error.actorUserId,
      auditActions.catalogConflictDetected,
      "failure",
      error.targetType,
      error.targetId,
      JSON.stringify(redactLogContext({ expectedRevision: error.expectedRevision })),
    ],
  );
}

function revisionEntityFromType(type: string): "category" | "module" | "subcategory" {
  return type.includes("subcategory")
    ? "subcategory"
    : type.includes("module")
      ? "module"
      : "category";
}

function conflictTargetType(type: string): string {
  return type;
}

function conflictRevisionInput(input: {
  actor: CatalogActor;
  expectedRevision: number;
  id: string;
  table: string;
  type: string;
}) {
  return {
    actor: input.actor,
    entity: revisionEntityFromType(input.type),
    expectedRevision: input.expectedRevision,
    id: input.id,
    table: input.table,
    targetType: conflictTargetType(input.type),
  };
}

async function archiveByRevision(
  client: PoolClient,
  input: {
    action: (typeof auditActions)[keyof typeof auditActions];
    actor: CatalogActor;
    expectedRevision: number;
    id: string;
    table: string;
    type: string;
  },
): Promise<void> {
  const result = await client.query(
    `
      update ${input.table}
      set archived_at = coalesce(archived_at, now()),
          updated_by = $2,
          updated_at = now(),
          revision = revision + 1
      where id = $1 and revision = $3
      returning revision
    `,
    [input.id, input.actor.id, input.expectedRevision],
  );
  await assertUpdated(client, result.rowCount, conflictRevisionInput(input));
  await insertAudit(client, {
    action: input.action,
    actorUserId: input.actor.id,
    metadata: {
      nextRevision: result.rows[0].revision,
      previousRevision: input.expectedRevision,
    },
    targetId: input.id,
    targetType: input.type,
  });
}

async function restoreByRevision(
  inputClient: { actor: CatalogActor },
  input: {
    action: (typeof auditActions)[keyof typeof auditActions];
    expectedRevision: number;
    id: string;
    table: string;
    type: string;
  },
): Promise<void> {
  await withCatalogTransaction(async (client) => {
    await restoreByRevisionInClient(client, { ...input, actor: inputClient.actor });
  });
}

async function restoreByRevisionInClient(
  client: PoolClient,
  input: {
    action: (typeof auditActions)[keyof typeof auditActions];
    actor: CatalogActor;
    expectedRevision: number;
    id: string;
    table: string;
    type: string;
  },
): Promise<void> {
  const result = await client.query(
    `
      update ${input.table}
      set archived_at = null,
          updated_by = $2,
          updated_at = now(),
          revision = revision + 1
      where id = $1 and revision = $3
      returning revision
    `,
    [input.id, input.actor.id, input.expectedRevision],
  );
  await assertUpdated(client, result.rowCount, conflictRevisionInput(input));
  await insertAudit(client, {
    action: input.action,
    actorUserId: input.actor.id,
    metadata: {
      nextRevision: result.rows[0].revision,
      previousRevision: input.expectedRevision,
    },
    targetId: input.id,
    targetType: input.type,
  });
}
