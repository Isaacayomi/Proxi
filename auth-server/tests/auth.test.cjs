const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
const localRequire = createRequire(path.join(root, "package.json"));
const ts = localRequire("typescript");
const originalFetch = global.fetch;
let database, env, mail, sendStatus;
const cache = new Map();
function load(file) {
	file = path.resolve(file);
	if (cache.has(file)) return cache.get(file).exports;
	const mod = { exports: {} };
	cache.set(file, mod);
	const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	const requireFor = (id) => {
		if (id.endsWith("common/logger"))
			return { createLogger: () => ({ debug() {}, info() {}, error() {} }) };
		if (id.startsWith("."))
			return load(path.resolve(path.dirname(file), id) + ".ts");
		return localRequire(id);
	};
	new Function("require", "exports", "module", compiled)(
		requireFor,
		mod.exports,
		mod,
	);
	return mod.exports;
}
const app = load(path.join(root, "src/index.ts")).default;
const req = async (url, body, token, method = body ? "POST" : "GET") => {
	const response = await app.request(
		url,
		{
			method,
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			...(body ? { body: JSON.stringify(body) } : {}),
		},
		env,
	);
	return { status: response.status, body: await response.json() };
};
async function initiate(email = "person@student.oauife.edu.ng") {
	const result = await req("/api/auth/initiate", { email });
	assert.equal(result.status, 200, JSON.stringify(result.body));
	const otp = mail.at(-1).html.match(/\b\d{6}\b/)[0];
	return { id: result.body.data.id, otp };
}
async function login(email) {
	const { id, otp } = await initiate(email);
	const result = await req("/api/auth/complete", { id, otp });
	assert.equal(result.status, 200);
	return result.body.data;
}
beforeEach(() => {
	database = new DatabaseSync(":memory:");
	for (const filename of fs
		.readdirSync(path.join(root, "src/database/migrations"))
		.filter((f) => f.endsWith(".sql"))
		.sort())
		database.exec(
			fs.readFileSync(
				path.join(root, "src/database/migrations", filename),
				"utf8",
			),
		);
	const DB = {
		prepare(sql) {
			const stmt = database.prepare(sql);
			const bound = (args = []) => ({
				bind: (...values) => bound(values),
				first: async () => stmt.get(...args) || null,
				run: async () => {
					const info = stmt.run(...args);
					return { success: true, meta: { changes: Number(info.changes) } };
				},
				all: async () => ({ results: stmt.all(...args) }),
			});
			return bound();
		},
	};
	env = { DB, RESEND_API_KEY: "re_test" };
	mail = [];
	sendStatus = 200;
	global.fetch = async (url, options) => {
		assert.equal(url, "https://api.resend.com/emails");
		mail.push(JSON.parse(options.body));
		return new Response(
			JSON.stringify(
				sendStatus === 200
					? { id: "fake-mail" }
					: { message: "Testing email restriction" },
			),
			{ status: sendStatus },
		);
	};
});
afterEach(() => {
	database.close();
	global.fetch = originalFetch;
});
test("OTP login, server profile, repeat login identity and revoked session", async () => {
	const first = await login();
	assert.equal(first.user.userType, "student");
	assert.equal(mail[0].from, "onboarding@resend.dev");
	const saved = await req(
		"/api/me/profile",
		{
			firstName: "Ada",
			lastName: "Student",
			matricNumber: "EEE/2024/001",
			userType: "lecturer",
		},
		first.token,
		"PUT",
	);
	assert.equal(saved.status, 200);
	assert.equal(saved.body.data.userType, "student");
	assert.equal(
		(await req("/api/me/profile", null, first.token)).body.data.firstName,
		"Ada",
	);
	database.exec("UPDATE auth_challenges SET created_at=0");
	const again = await login();
	assert.equal(again.user.id, first.user.id);
	assert.equal(again.user.firstName, "Ada");
	assert.equal((await req("/api/me/logout", {}, again.token)).status, 200);
	assert.equal((await req("/api/me/profile", null, again.token)).status, 401);
});
test("arbitrary addresses keep the requested existing lecturer routing rule", async () => {
	const session = await login("Owner@Example.com");
	assert.equal(session.user.userType, "lecturer");
	assert.equal(session.user.email, "owner@example.com");
	assert.equal(
		(
			await req(
				"/api/me/profile",
				{ firstName: "Lecturer", lastName: "One" },
				session.token,
				"PUT",
			)
		).status,
		200,
	);
});
test("wrong codes are limited, used codes cannot be replayed, and expired sessions fail", async () => {
	let challenge = await initiate();
	for (let i = 0; i < 5; i++)
		assert.equal(
			(
				await req("/api/auth/complete", {
					id: challenge.id,
					otp: challenge.otp === "000000" ? "111111" : "000000",
				})
			).status,
			400,
		);
	assert.equal((await req("/api/auth/complete", challenge)).status, 400);
	database.exec("DELETE FROM auth_challenges");
	challenge = await initiate("other@student.oauife.edu.ng");
	const success = await req("/api/auth/complete", challenge);
	assert.equal(success.status, 200);
	assert.equal((await req("/api/auth/complete", challenge)).status, 400);
	database.exec("UPDATE auth_sessions SET expires_at=0");
	assert.equal(
		(await req("/api/me/profile", null, success.body.data.token)).status,
		401,
	);
});
test("resend cooldown, delivery errors, and configuration failures are actionable", async () => {
	await initiate();
	assert.equal(
		(await req("/api/auth/initiate", { email: "person@student.oauife.edu.ng" }))
			.status,
		429,
	);
	sendStatus = 403;
	assert.equal(
		(await req("/api/auth/initiate", { email: "blocked@example.com" })).status,
		503,
	);
	assert.equal(
		database
			.prepare("SELECT COUNT(*) AS count FROM auth_challenges WHERE email=?")
			.get("blocked@example.com").count,
		0,
	);
	env.RESEND_API_KEY = "";
	assert.equal(
		(await req("/api/auth/initiate", { email: "owner@example.com" })).status,
		503,
	);
	assert.equal((await req("/api/auth/initiate", { email: "bad" })).status, 400);
});
test("profiles require authentication, validate matric numbers, and reject duplicates", async () => {
	assert.equal((await req("/api/me/profile")).status, 401);
	const a = await login();
	assert.equal(
		(
			await req(
				"/api/me/profile",
				{ firstName: "A", lastName: "B", matricNumber: "bad" },
				a.token,
				"PUT",
			)
		).status,
		400,
	);
	await req(
		"/api/me/profile",
		{ firstName: "A", lastName: "B", matricNumber: "EEE/2024/001" },
		a.token,
		"PUT",
	);
	const b = await login("second@student.oauife.edu.ng");
	assert.equal(
		(
			await req(
				"/api/me/profile",
				{ firstName: "B", lastName: "C", matricNumber: "EEE/2024/001" },
				b.token,
				"PUT",
			)
		).status,
		409,
	);
});
test("concurrent verification can issue only one session", async () => {
	const challenge = await initiate();
	const results = await Promise.all([
		req("/api/auth/complete", challenge),
		req("/api/auth/complete", challenge),
	]);
	assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
});
