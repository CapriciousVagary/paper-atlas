ALTER TABLE `papers` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `papers` ADD `figure_keys` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `papers` ADD `key_figure_key` text;--> statement-breakpoint
ALTER TABLE `papers` ADD `figure_caption` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `papers` ADD `submitter_name` text DEFAULT '匿名投稿者' NOT NULL;--> statement-breakpoint
ALTER TABLE `papers` ADD `submitter_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `papers` ADD `reviewed_at` text;--> statement-breakpoint
UPDATE `papers` SET `status` = 'pending' WHERE `status` = 'draft';--> statement-breakpoint
CREATE INDEX `papers_status_idx` ON `papers` (`status`);
