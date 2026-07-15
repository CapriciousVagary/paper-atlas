CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_slug` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_paper_slug_idx` ON `comments` (`paper_slug`);--> statement-breakpoint
CREATE TABLE `papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text NOT NULL,
	`journal` text DEFAULT '待补充' NOT NULL,
	`published` text DEFAULT '待补充' NOT NULL,
	`authors` text DEFAULT '[]' NOT NULL,
	`institutions` text DEFAULT '[]' NOT NULL,
	`abstract_zh` text DEFAULT '' NOT NULL,
	`insight` text DEFAULT '' NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`file_key` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `papers_slug_unique` ON `papers` (`slug`);--> statement-breakpoint
CREATE INDEX `papers_category_idx` ON `papers` (`category`);--> statement-breakpoint
CREATE INDEX `papers_created_at_idx` ON `papers` (`created_at`);