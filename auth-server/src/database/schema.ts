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
