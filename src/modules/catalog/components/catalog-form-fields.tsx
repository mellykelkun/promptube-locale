import type {
  CatalogCategoryDto,
  CatalogModuleDto,
  CatalogSubcategoryDto,
} from "@/server/catalog/catalog-types";

type CategoryFieldsProps = Readonly<{
  category?: CatalogCategoryDto;
}>;

type SubcategoryFieldsProps = Readonly<{
  categories: CatalogCategoryDto[];
  subcategory?: CatalogSubcategoryDto;
}>;

type ModuleFieldsProps = Readonly<{
  module?: CatalogModuleDto;
  subcategories: CatalogSubcategoryDto[];
}>;

const inputClass = "px-3 py-2 text-sm";
const textareaClass = "min-h-28 px-3 py-2 text-sm";

export function CategoryFields({ category }: CategoryFieldsProps) {
  return (
    <>
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      {category ? <input name="expectedRevision" type="hidden" value={category.revision} /> : null}
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Nom
        <input
          className={inputClass}
          defaultValue={category?.name}
          maxLength={120}
          minLength={2}
          name="name"
          required
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Slug
        <input
          className={inputClass}
          defaultValue={category?.slug}
          maxLength={160}
          minLength={2}
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="generé depuis le nom si vide"
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Ordre
        <input
          className={inputClass}
          defaultValue={category?.sortOrder ?? 0}
          max={100000}
          min={-100000}
          name="sortOrder"
          required
          type="number"
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)] md:col-span-2">
        Description
        <textarea
          className={textareaClass}
          defaultValue={category?.description ?? ""}
          maxLength={1000}
          name="description"
        />
      </label>
    </>
  );
}

export function SubcategoryFields({ categories, subcategory }: SubcategoryFieldsProps) {
  return (
    <>
      {subcategory ? <input name="id" type="hidden" value={subcategory.id} /> : null}
      {subcategory ? (
        <input name="expectedRevision" type="hidden" value={subcategory.revision} />
      ) : null}
      <label className="grid gap-2 text-sm text-[var(--text-primary)] md:col-span-2">
        Catégorie parente
        <select
          className={inputClass}
          defaultValue={subcategory?.categoryId}
          name="categoryId"
          required
        >
          <option value="">Choisir une catégorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <CategoryFields category={subcategory} />
    </>
  );
}

export function ModuleFields({ module, subcategories }: ModuleFieldsProps) {
  return (
    <>
      {module ? <input name="id" type="hidden" value={module.id} /> : null}
      {module ? <input name="expectedRevision" type="hidden" value={module.revision} /> : null}
      <label className="grid gap-2 text-sm text-[var(--text-primary)] md:col-span-2">
        Sous-catégorie
        <select
          className={inputClass}
          defaultValue={module?.subcategoryId}
          name="subcategoryId"
          required
        >
          <option value="">Choisir une sous-catégorie</option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.categoryName} / {subcategory.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Titre
        <input
          className={inputClass}
          defaultValue={module?.title}
          maxLength={180}
          minLength={2}
          name="title"
          required
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Slug
        <input
          className={inputClass}
          defaultValue={module?.slug}
          maxLength={160}
          minLength={2}
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)]">
        Locale
        <input
          className={inputClass}
          defaultValue={module?.locale ?? "fr"}
          maxLength={8}
          name="locale"
          pattern="[a-z]{2}(-[A-Z]{2})?"
          required
        />
      </label>
      <label className="grid gap-2 text-sm text-[var(--text-primary)] md:col-span-2">
        Résumé
        <textarea
          className={textareaClass}
          defaultValue={module?.summary ?? ""}
          maxLength={500}
          name="summary"
          required
        />
      </label>
      {!module ? (
        <label className="grid gap-2 text-sm text-[var(--text-primary)] md:col-span-2">
          Contenu Markdown initial
          <textarea
            className="min-h-44 px-3 py-2 font-mono text-sm"
            defaultValue="Brouillon initial."
            maxLength={50000}
            name="contentMarkdown"
            required
          />
        </label>
      ) : null}
    </>
  );
}
