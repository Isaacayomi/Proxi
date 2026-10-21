import { defineConfig } from "drizzle-kit";

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value)
		throw new Error(`Missing required database configuration: ${name}`);
	return value;
}

export default defineConfig({
	strict: true,
	dialect: "sqlite",
	driver: "d1-http",
	out: "./src/database/migrations",
	schema: "./src/database/schema.ts",
	dbCredentials: {
		databaseId: requiredEnv("CLOUDFLARE_DATABASE_ID"),
		accountId: requiredEnv("CLOUDFLARE_ACCOUNT_ID"),
		token: requiredEnv("CLOUDFLARE_D1_TOKEN"),
	},
});
