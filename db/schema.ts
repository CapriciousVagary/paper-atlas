import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const papers = sqliteTable("papers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory").notNull(),
  journal: text("journal").notNull().default("待补充"),
  published: text("published").notNull().default("待补充"),
  authors: text("authors").notNull().default("[]"),
  institutions: text("institutions").notNull().default("[]"),
  authorDetails: text("author_details").notNull().default("[]"),
  abstractZh: text("abstract_zh").notNull().default(""),
  insight: text("insight").notNull().default(""),
  tags: text("tags").notNull().default("[]"),
  sourceUrl: text("source_url").notNull().default(""),
  fileKey: text("file_key"),
  figureKeys: text("figure_keys").notNull().default("[]"),
  keyFigureKey: text("key_figure_key"),
  figureCaption: text("figure_caption").notNull().default(""),
  submitterName: text("submitter_name").notNull().default("匿名投稿者"),
  submitterEmail: text("submitter_email").notNull().default(""),
  status: text("status").notNull().default("pending"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("papers_category_idx").on(table.category),
  index("papers_status_idx").on(table.status),
  index("papers_created_at_idx").on(table.createdAt),
]);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  paperSlug: text("paper_slug").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("comments_paper_slug_idx").on(table.paperSlug)]);

export const institutions = sqliteTable("institutions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull().unique(),
  normalizedName: text("normalized_name").notNull(),
  aliases: text("aliases").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("institutions_normalized_name_idx").on(table.normalizedName)]);
