CREATE TABLE `audit_results` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`page_id` text,
	`category` text NOT NULL,
	`check_id` text NOT NULL,
	`status` text NOT NULL,
	`score` real NOT NULL,
	`max_score` real NOT NULL,
	`priority` text NOT NULL,
	`description` text NOT NULL,
	`recommendation` text,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_results_scan_id` ON `audit_results` (`scan_id`);--> statement-breakpoint
CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_domain_unique` ON `domains` (`domain`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`url` text NOT NULL,
	`status_code` integer NOT NULL,
	`title` text,
	`description` text,
	`canonical` text,
	`content` text,
	`score` integer NOT NULL,
	`page_json` text NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pages_scan_id` ON `pages` (`scan_id`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`title` text NOT NULL,
	`impact` text NOT NULL,
	`difficulty` text NOT NULL,
	`payload_json` text NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recommendations_scan_id` ON `recommendations` (`scan_id`);--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`status` text NOT NULL,
	`score` integer NOT NULL,
	`report_json` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scans_domain_completed` ON `scans` (`domain_id`,`completed_at`);