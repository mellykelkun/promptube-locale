CREATE TABLE "catalog_categories" (
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "catalog_categories_name_length_check" CHECK (char_length("catalog_categories"."name") between 2 and 120),
	CONSTRAINT "catalog_categories_slug_length_check" CHECK (char_length("catalog_categories"."slug") between 2 and 160),
	CONSTRAINT "catalog_categories_slug_format_check" CHECK ("catalog_categories"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_categories_description_length_check" CHECK ("catalog_categories"."description" is null or char_length("catalog_categories"."description") <= 1000),
	CONSTRAINT "catalog_categories_sort_order_check" CHECK ("catalog_categories"."sort_order" between -100000 and 100000),
	CONSTRAINT "catalog_categories_revision_positive_check" CHECK ("catalog_categories"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "catalog_module_versions" (
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"changelog" text,
	"content_markdown" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"reviewed_by" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"version_number" integer NOT NULL,
	"workflow_status" text DEFAULT 'DRAFT' NOT NULL,
	CONSTRAINT "catalog_module_versions_number_check" CHECK ("catalog_module_versions"."version_number" >= 1),
	CONSTRAINT "catalog_module_versions_revision_positive_check" CHECK ("catalog_module_versions"."revision" >= 1),
	CONSTRAINT "catalog_module_versions_status_check" CHECK ("catalog_module_versions"."workflow_status" in ('DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED')),
	CONSTRAINT "catalog_module_versions_content_length_check" CHECK (char_length("catalog_module_versions"."content_markdown") between 1 and 50000),
	CONSTRAINT "catalog_module_versions_changelog_length_check" CHECK ("catalog_module_versions"."changelog" is null or char_length("catalog_module_versions"."changelog") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "catalog_modules" (
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"slug" text NOT NULL,
	"subcategory_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "catalog_modules_title_length_check" CHECK (char_length("catalog_modules"."title") between 2 and 180),
	CONSTRAINT "catalog_modules_slug_length_check" CHECK (char_length("catalog_modules"."slug") between 2 and 160),
	CONSTRAINT "catalog_modules_slug_format_check" CHECK ("catalog_modules"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_modules_summary_length_check" CHECK (char_length("catalog_modules"."summary") between 1 and 500),
	CONSTRAINT "catalog_modules_locale_format_check" CHECK ("catalog_modules"."locale" ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
	CONSTRAINT "catalog_modules_revision_positive_check" CHECK ("catalog_modules"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "catalog_subcategories" (
	"archived_at" timestamp with time zone,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "catalog_subcategories_name_length_check" CHECK (char_length("catalog_subcategories"."name") between 2 and 120),
	CONSTRAINT "catalog_subcategories_slug_length_check" CHECK (char_length("catalog_subcategories"."slug") between 2 and 160),
	CONSTRAINT "catalog_subcategories_slug_format_check" CHECK ("catalog_subcategories"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "catalog_subcategories_description_length_check" CHECK ("catalog_subcategories"."description" is null or char_length("catalog_subcategories"."description") <= 1000),
	CONSTRAINT "catalog_subcategories_sort_order_check" CHECK ("catalog_subcategories"."sort_order" between -100000 and 100000),
	CONSTRAINT "catalog_subcategories_revision_positive_check" CHECK ("catalog_subcategories"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_module_versions" ADD CONSTRAINT "catalog_module_versions_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_module_versions" ADD CONSTRAINT "catalog_module_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_module_versions" ADD CONSTRAINT "catalog_module_versions_module_id_catalog_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."catalog_modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_module_versions" ADD CONSTRAINT "catalog_module_versions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_module_versions" ADD CONSTRAINT "catalog_module_versions_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_modules" ADD CONSTRAINT "catalog_modules_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_modules" ADD CONSTRAINT "catalog_modules_subcategory_id_catalog_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."catalog_subcategories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_modules" ADD CONSTRAINT "catalog_modules_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_subcategories" ADD CONSTRAINT "catalog_subcategories_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_subcategories" ADD CONSTRAINT "catalog_subcategories_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_subcategories" ADD CONSTRAINT "catalog_subcategories_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_slug_unique" ON "catalog_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_categories_archived_at_idx" ON "catalog_categories" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "catalog_categories_sort_idx" ON "catalog_categories" USING btree ("sort_order","name");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_module_versions_module_number_unique" ON "catalog_module_versions" USING btree ("module_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_module_versions_one_mutable_per_module_idx" ON "catalog_module_versions" USING btree ("module_id") WHERE "catalog_module_versions"."workflow_status" in ('DRAFT', 'IN_REVIEW');--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_module_versions_one_approved_per_module_idx" ON "catalog_module_versions" USING btree ("module_id") WHERE "catalog_module_versions"."workflow_status" = 'APPROVED';--> statement-breakpoint
CREATE INDEX "catalog_module_versions_module_idx" ON "catalog_module_versions" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "catalog_module_versions_status_idx" ON "catalog_module_versions" USING btree ("workflow_status");--> statement-breakpoint
CREATE INDEX "catalog_module_versions_updated_at_idx" ON "catalog_module_versions" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_modules_slug_unique" ON "catalog_modules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_modules_subcategory_idx" ON "catalog_modules" USING btree ("subcategory_id");--> statement-breakpoint
CREATE INDEX "catalog_modules_archived_at_idx" ON "catalog_modules" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "catalog_modules_updated_at_idx" ON "catalog_modules" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_subcategories_category_slug_unique" ON "catalog_subcategories" USING btree ("category_id","slug");--> statement-breakpoint
CREATE INDEX "catalog_subcategories_category_idx" ON "catalog_subcategories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_subcategories_archived_at_idx" ON "catalog_subcategories" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "catalog_subcategories_sort_idx" ON "catalog_subcategories" USING btree ("category_id","sort_order","name");