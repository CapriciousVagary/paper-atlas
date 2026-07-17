CREATE TABLE `paper_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_slug` text NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`changes` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `paper_audit_logs_slug_idx` ON `paper_audit_logs` (`paper_slug`);
