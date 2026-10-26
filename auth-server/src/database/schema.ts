import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { newId } from "@/common/id";

export const users = sqliteTable("users", {
	id: text("id")
		.primaryKey()
		.$default(() => newId("user")),
	email: text("email").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	firstName: text("first_name"),
	lastName: text("last_name"),
	matricNumber: text("matric_number").unique(),
	role: text("role", { enum: ["student", "lecturer"] })
		.notNull()
		.default("student"),
	lastLogin: integer("last_login", { mode: "timestamp" }),
});

export const attendanceSessions = sqliteTable("attendance_sessions", {
	id: text("id").primaryKey().$default(() => newId("attsession")),
	lecturerId: text("lecturer_id")
		.notNull()
		.references(() => users.id),
	courseCode: text("course_code").notNull(),
	courseName: text("course_name").notNull(),
	sessionTokenHash: text("session_token_hash").notNull(),
	startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
	endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
	status: text("status", { enum: ["active", "ended", "expired"] })
		.notNull()
		.default("active"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export const attendanceRecords = sqliteTable("attendance_records", {
	id: text("id").primaryKey().$default(() => newId("attrec")),
	sessionId: text("session_id")
		.notNull()
		.references(() => attendanceSessions.id),
	studentId: text("student_id")
		.notNull()
		.references(() => users.id),
	matricNumber: text("matric_number"),
	submittedAt: integer("submitted_at", { mode: "timestamp" })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	clientNonceHash: text("client_nonce_hash"),
});

export const qrRotations = sqliteTable("qr_rotations", {
	id: text("id").primaryKey().$default(() => newId("qrrot")),
	sessionId: text("session_id")
		.notNull()
		.references(() => attendanceSessions.id),
	slot: integer("slot").notNull(),
	nonce: text("nonce").notNull(),
	issuedAt: integer("issued_at", { mode: "timestamp" }).notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});
