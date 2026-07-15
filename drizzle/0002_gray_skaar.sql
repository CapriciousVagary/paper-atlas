CREATE TABLE `institutions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `institutions_full_name_unique` ON `institutions` (`full_name`);--> statement-breakpoint
CREATE INDEX `institutions_normalized_name_idx` ON `institutions` (`normalized_name`);--> statement-breakpoint
ALTER TABLE `papers` ADD `author_details` text DEFAULT '[]' NOT NULL;