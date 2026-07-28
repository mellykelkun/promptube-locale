"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireCompletedTwoFactor } from "@/server/auth/session";
import { catalogErrorCodes, isCatalogError } from "@/server/catalog/catalog-errors";
import { assertCatalogCapability } from "@/server/catalog/catalog-policy";
import {
  approveCatalogModuleVersion,
  archiveCatalogCategory,
  archiveCatalogModule,
  archiveCatalogSubcategory,
  createCatalogCategory,
  createCatalogModule,
  createCatalogSubcategory,
  createNextCatalogModuleVersion,
  restoreCatalogCategory,
  restoreCatalogModule,
  restoreCatalogSubcategory,
  returnCatalogModuleVersionToDraft,
  submitCatalogModuleVersion,
  updateCatalogCategory,
  updateCatalogModule,
  updateCatalogModuleVersion,
  updateCatalogSubcategory,
} from "@/server/catalog/catalog-service";
import {
  archiveEntitySchema,
  createCategorySchema,
  createModuleSchema,
  createSubcategorySchema,
  getFormString,
  normalizeCatalogSlug,
  parseOptionalText,
  transitionModuleVersionSchema,
  updateCategorySchema,
  updateModuleSchema,
  updateModuleVersionSchema,
  updateSubcategorySchema,
} from "@/server/catalog/catalog-validation";

import type { CatalogActor } from "@/server/catalog/catalog-types";

async function getCatalogActor(): Promise<CatalogActor> {
  const current = await requireCompletedTwoFactor();
  return {
    id: current.admin.id,
    role: current.admin.role,
    twoFactorEnabled: current.admin.twoFactorEnabled,
  };
}

function errorCode(error: unknown): string {
  if (isCatalogError(error)) {
    return error.code;
  }

  if (error instanceof ZodError) {
    return catalogErrorCodes.invalidInput;
  }

  return catalogErrorCodes.invalidInput;
}

function redirectWithStatus(path: string, status: "created" | "saved" | string): never {
  revalidatePath("/catalog");
  redirect(`${path}?status=${encodeURIComponent(status)}`);
}

function redirectWithError(path: string, error: unknown): never {
  revalidatePath("/catalog");
  redirect(`${path}?error=${encodeURIComponent(errorCode(error))}`);
}

function categoryInput(formData: FormData) {
  const name = getFormString(formData, "name");
  const slugSource = getFormString(formData, "slug") || name;

  return {
    description: parseOptionalText(formData.get("description")),
    name,
    slug: normalizeCatalogSlug(slugSource),
    sortOrder: getFormString(formData, "sortOrder") || "0",
  };
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:create");
  let destination: string;

  try {
    const id = await createCatalogCategory(
      actor,
      createCategorySchema.parse(categoryInput(formData)),
    );
    destination = `/catalog/categories/${id}`;
  } catch (error) {
    redirectWithError("/catalog/categories/new", error);
  }

  redirectWithStatus(destination, "created");
}

export async function updateCategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:update");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    const input = updateCategorySchema.parse({
      ...categoryInput(formData),
      expectedRevision: getFormString(formData, "expectedRevision"),
      id,
    });
    await updateCatalogCategory(actor, input);
    destination = `/catalog/categories/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/categories/${id}`, error);
  }

  redirectWithStatus(destination, "saved");
}

export async function archiveCategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:archive");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await archiveCatalogCategory(
      actor,
      archiveEntitySchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/categories/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/categories/${id}`, error);
  }

  redirectWithStatus(destination, "archived");
}

export async function restoreCategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:archive");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await restoreCatalogCategory(
      actor,
      archiveEntitySchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/categories/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/categories/${id}`, error);
  }

  redirectWithStatus(destination, "restored");
}

export async function createSubcategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:create");
  let destination: string;

  try {
    const id = await createCatalogSubcategory(
      actor,
      createSubcategorySchema.parse({
        ...categoryInput(formData),
        categoryId: getFormString(formData, "categoryId"),
      }),
    );
    destination = `/catalog/subcategories/${id}`;
  } catch (error) {
    redirectWithError("/catalog/subcategories/new", error);
  }

  redirectWithStatus(destination, "created");
}

export async function updateSubcategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:update");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await updateCatalogSubcategory(
      actor,
      updateSubcategorySchema.parse({
        ...categoryInput(formData),
        categoryId: getFormString(formData, "categoryId"),
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/subcategories/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/subcategories/${id}`, error);
  }

  redirectWithStatus(destination, "saved");
}

export async function archiveSubcategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:archive");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await archiveCatalogSubcategory(
      actor,
      archiveEntitySchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/subcategories/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/subcategories/${id}`, error);
  }

  redirectWithStatus(destination, "archived");
}

export async function restoreSubcategoryAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:archive");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await restoreCatalogSubcategory(
      actor,
      archiveEntitySchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/subcategories/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/subcategories/${id}`, error);
  }

  redirectWithStatus(destination, "restored");
}

function moduleInput(formData: FormData) {
  const title = getFormString(formData, "title");
  const slugSource = getFormString(formData, "slug") || title;

  return {
    locale: getFormString(formData, "locale") || "fr",
    slug: normalizeCatalogSlug(slugSource),
    subcategoryId: getFormString(formData, "subcategoryId"),
    summary: getFormString(formData, "summary"),
    title,
  };
}

export async function createModuleAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:create");
  let destination: string;

  try {
    const id = await createCatalogModule(
      actor,
      createModuleSchema.parse({
        ...moduleInput(formData),
        contentMarkdown: getFormString(formData, "contentMarkdown") || "Brouillon initial.",
      }),
    );
    destination = `/catalog/modules/${id}`;
  } catch (error) {
    redirectWithError("/catalog/modules/new", error);
  }

  redirectWithStatus(destination, "created");
}

export async function updateModuleAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:update");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await updateCatalogModule(
      actor,
      updateModuleSchema.parse({
        ...moduleInput(formData),
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/modules/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/modules/${id}`, error);
  }

  redirectWithStatus(destination, "saved");
}

export async function archiveModuleAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:archive");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await archiveCatalogModule(
      actor,
      archiveEntitySchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/modules/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/modules/${id}`, error);
  }

  redirectWithStatus(destination, "archived");
}

export async function restoreModuleAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:archive");
  const id = getFormString(formData, "id");
  let destination: string;

  try {
    await restoreCatalogModule(
      actor,
      archiveEntitySchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/modules/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/modules/${id}`, error);
  }

  redirectWithStatus(destination, "restored");
}

export async function updateVersionAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:update");
  const id = getFormString(formData, "id");
  const moduleId = getFormString(formData, "moduleId");
  let destination: string;

  try {
    await updateCatalogModuleVersion(
      actor,
      updateModuleVersionSchema.parse({
        changelog: parseOptionalText(formData.get("changelog")),
        contentMarkdown: getFormString(formData, "contentMarkdown"),
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/modules/${moduleId}/versions/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/modules/${moduleId}/versions/${id}`, error);
  }

  redirectWithStatus(destination, "saved");
}

export async function submitVersionAction(formData: FormData): Promise<void> {
  await transitionVersionAction(
    formData,
    "catalog:review",
    submitCatalogModuleVersion,
    "submitted",
  );
}

export async function returnVersionToDraftAction(formData: FormData): Promise<void> {
  await transitionVersionAction(
    formData,
    "catalog:review",
    returnCatalogModuleVersionToDraft,
    "returned",
  );
}

export async function approveVersionAction(formData: FormData): Promise<void> {
  await transitionVersionAction(
    formData,
    "catalog:approve",
    approveCatalogModuleVersion,
    "approved",
  );
}

export async function createNextVersionAction(formData: FormData): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, "catalog:create");
  const approvedVersionId = getFormString(formData, "id");
  const moduleId = getFormString(formData, "moduleId");
  let destination: string;

  try {
    const id = await createNextCatalogModuleVersion(actor, approvedVersionId);
    destination = `/catalog/modules/${moduleId}/versions/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/modules/${moduleId}/versions/${approvedVersionId}`, error);
  }

  redirectWithStatus(destination, "created");
}

async function transitionVersionAction(
  formData: FormData,
  capability: "catalog:approve" | "catalog:review",
  action: (actor: CatalogActor, input: { expectedRevision: number; id: string }) => Promise<void>,
  status: string,
): Promise<void> {
  const actor = await getCatalogActor();
  assertCatalogCapability(actor, capability);
  const id = getFormString(formData, "id");
  const moduleId = getFormString(formData, "moduleId");
  let destination: string;

  try {
    await action(
      actor,
      transitionModuleVersionSchema.parse({
        expectedRevision: getFormString(formData, "expectedRevision"),
        id,
      }),
    );
    destination = `/catalog/modules/${moduleId}/versions/${id}`;
  } catch (error) {
    redirectWithError(`/catalog/modules/${moduleId}/versions/${id}`, error);
  }

  redirectWithStatus(destination, status);
}
