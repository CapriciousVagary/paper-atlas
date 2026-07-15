ALTER TABLE `papers` ADD `classifications` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `papers` ADD `title_zh` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `papers` ADD `doi` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `paper_edits` (
	`slug` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
