CREATE TABLE `attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`lecturer_id` text NOT NULL,
	`course_code` text NOT NULL,
	`course_name` text NOT NULL,
	`session_token_hash` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`lecturer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`matric_number` text,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`client_nonce_hash` text,
	FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_records_session_student_unique` ON `attendance_records` (`session_id`,`student_id`);
