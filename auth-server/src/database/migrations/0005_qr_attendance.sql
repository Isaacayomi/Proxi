ALTER TABLE attendance_sessions ADD COLUMN qr_secret_hash TEXT;
--> statement-breakpoint
ALTER TABLE attendance_sessions ADD COLUMN qr_rotation_seconds INTEGER DEFAULT 15 NOT NULL;
--> statement-breakpoint
ALTER TABLE attendance_sessions ADD COLUMN qr_last_rotated INTEGER;
