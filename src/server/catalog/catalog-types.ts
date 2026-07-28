import "server-only";

export const catalogWorkflowStatuses = ["DRAFT", "IN_REVIEW", "APPROVED", "SUPERSEDED"] as const;

export type CatalogWorkflowStatus = (typeof catalogWorkflowStatuses)[number];

export type CatalogActor = {
  id: string;
  role: string;
  twoFactorEnabled: boolean;
};

export type CatalogListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  status?: "active" | "all" | "archived";
};

export type CatalogCategoryDto = {
  archivedAt: Date | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  revision: number;
  slug: string;
  sortOrder: number;
  updatedAt: Date;
};

export type CatalogSubcategoryDto = CatalogCategoryDto & {
  categoryId: string;
  categoryName: string;
};

export type CatalogModuleDto = {
  archivedAt: Date | null;
  categoryName: string;
  createdAt: Date;
  id: string;
  latestStatus: CatalogWorkflowStatus | null;
  locale: string;
  revision: number;
  slug: string;
  subcategoryId: string;
  subcategoryName: string;
  summary: string;
  title: string;
  updatedAt: Date;
};

export type CatalogModuleVersionDto = {
  approvedAt: Date | null;
  changelog: string | null;
  contentMarkdown: string;
  createdAt: Date;
  id: string;
  moduleId: string;
  revision: number;
  submittedAt: Date | null;
  updatedAt: Date;
  versionNumber: number;
  workflowStatus: CatalogWorkflowStatus;
};

export type CatalogPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
