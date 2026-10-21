import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { createLogger } from "./common/logger";
import { sendTransactionalEmail } from "./helpers";

type Bindings = {
	DB: D1Database;
	RESEND_API_KEY: string;
	RESEND_FROM_EMAIL?: string;
	ALLOWED_ORIGIN?: string;
};
type User = {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	matric_number: string | null;
	role: "student" | "lecturer";
};
const logger = createLogger({ level: "info", mode: "json" });
const roleFor = (email: string) =>
	email.endsWith("@student.oauife.edu.ng") ? "student" : "lecturer";
const hash = async (value: string) =>
	Array.from(
		new Uint8Array(
			await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
		),
		(b) => b.toString(16).padStart(2, "0"),
	).join("");
const profile = (u: User) => ({
	id: u.id,
	email: u.email,
	firstName: u.first_name ?? "",
	lastName: u.last_name ?? "",
	matricNumber: u.matric_number ?? "",
	userType: u.role,
});
const app = new Hono<{
	Bindings: Bindings;
	Variables: { user: User; tokenHash: string };
}>();
app.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	await next();
});
app.use(
	"*",
	bodyLimit({
		maxSize: 4096,
		onError: (c) =>
			c.json({ success: false, message: "Request is too large." }, 413),
	}),
);
app.use(
	"*",
	cors({
		origin: (origin, c) => (c.env.ALLOWED_ORIGIN === origin ? origin : ""),
	}),
);
app.get("/", (c) =>
	c.json({ success: true, message: "Proxi API is up and running!" }),
);
app.post("/api/auth/initiate", async (c) => {
	const body = await c.req.json().catch(() => null);
	const email =
		typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
		return c.json(
			{ success: false, message: "Enter a valid email address." },
			400,
		);
	if (!c.env.RESEND_API_KEY?.trim().startsWith("re_"))
		return c.json(
			{
				success: false,
				message:
					"Email sign-in is not configured. Please contact the project team.",
			},
			503,
		);
	const now = Date.now();
	for (const [key, limit] of [
		[`email:${email}`, 5],
		[`ip:${await hash(c.req.header("CF-Connecting-IP") || "local")}`, 30],
	] as const) {
		const rate = await c.env.DB.prepare(
			"INSERT INTO auth_rates(key,started_at,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN started_at<? THEN 1 ELSE count+1 END, started_at=CASE WHEN started_at<? THEN excluded.started_at ELSE started_at END RETURNING count",
		)
			.bind(key, now, now - 600000, now - 600000)
			.first<{ count: number }>();
		if ((rate?.count ?? 0) > limit)
			return c.json(
				{
					success: false,
					message: "Too many code requests. Try again in ten minutes.",
				},
				429,
			);
	}
	const recent = await c.env.DB.prepare(
		"SELECT created_at FROM auth_challenges WHERE email=? ORDER BY created_at DESC LIMIT 1",
	)
		.bind(email)
		.first<{ created_at: number }>();
	if (recent && now - recent.created_at < 60000)
		return c.json(
			{
				success: false,
				message: "Please wait one minute before requesting another code.",
			},
			429,
		);
	const id = crypto.randomUUID();
	const values = crypto.getRandomValues(new Uint32Array(1));
	const otp = String(values[0] % 1000000).padStart(6, "0");
	await c.env.DB.prepare(
		"INSERT INTO auth_challenges(id,email,code_hash,created_at,expires_at) VALUES(?,?,?,?,?)",
	)
		.bind(id, email, await hash(`${id}:${otp}`), now, now + 600000)
		.run();
	try {
		await sendTransactionalEmail(c.env.RESEND_API_KEY, {
			to: email,
			from: c.env.RESEND_FROM_EMAIL,
			logger,
			templateName: "otp",
			templateOptions: { otp, expirationMinutes: 10 },
		});
	} catch (error) {
		await c.env.DB.prepare("DELETE FROM auth_challenges WHERE id=?")
			.bind(id)
			.run();
		logger.error({
			msg: "OTP email delivery failed",
			service: "email",
			error: error as Error,
		});
		return c.json(
			{
				success: false,
				message:
					"We could not send your code. Check the email address and try again. During testing, use the email registered with Resend.",
			},
			503,
		);
	}
	// The latest delivered code replaces any previous challenge for this email.
	await c.env.DB.prepare("DELETE FROM auth_challenges WHERE email=? AND id<>?")
		.bind(email, id)
		.run();
	await c.env.DB.prepare("DELETE FROM auth_challenges WHERE expires_at<?")
		.bind(now)
		.run();
	await c.env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at<?")
		.bind(now)
		.run();
	await c.env.DB.prepare("DELETE FROM auth_rates WHERE started_at<?")
		.bind(now - 600000)
		.run();
	return c.json({
		success: true,
		message: "Check your email for a verification code.",
		data: { id, resendAfter: 60 },
	});
});
app.post("/api/auth/complete", async (c) => {
	const body = await c.req.json().catch(() => null);
	if (
		typeof body?.id !== "string" ||
		body.id.length > 100 ||
		!/^\d{6}$/.test(body?.otp ?? "")
	)
		return c.json(
			{ success: false, message: "Enter the six-digit verification code." },
			400,
		);
	const challenge = await c.env.DB.prepare(
		"UPDATE auth_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND expires_at>? AND attempts<5 RETURNING email,code_hash",
	)
		.bind(body.id, Date.now())
		.first<{ email: string; code_hash: string }>();
	if (!challenge)
		return c.json(
			{
				success: false,
				message:
					"This code has expired, was already used, or has too many failed attempts. Request a new code.",
			},
			400,
		);
	if ((await hash(`${body.id}:${body.otp}`)) !== challenge.code_hash)
		return c.json(
			{
				success: false,
				message: "Incorrect verification code. Please try again.",
			},
			400,
		);
	const claimed = await c.env.DB.prepare(
		"UPDATE auth_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL RETURNING id",
	)
		.bind(Date.now(), body.id)
		.first();
	if (!claimed)
		return c.json(
			{
				success: false,
				message: "This code has already been used. Request a new code.",
			},
			400,
		);
	const email = challenge.email;
	await c.env.DB.prepare(
		"INSERT INTO users(id,email,role) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING",
	)
		.bind(crypto.randomUUID(), email, roleFor(email))
		.run();
	await c.env.DB.prepare("UPDATE users SET role=?,last_login=? WHERE email=?")
		.bind(roleFor(email), Math.floor(Date.now() / 1000), email)
		.run();
	const user = await c.env.DB.prepare("SELECT * FROM users WHERE email=?")
		.bind(email)
		.first<User>();
	if (!user) throw new Error("User was not created");
	const token = crypto.randomUUID() + crypto.randomUUID();
	const expiresAt = Date.now() + 30 * 86400000;
	await c.env.DB.prepare(
		"INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
	)
		.bind(await hash(token), user.id, expiresAt)
		.run();
	return c.json({
		success: true,
		message: "Signed in successfully.",
		data: { token, expiresAt, user: profile(user) },
	});
});
app.use("/api/me/*", async (c, next) => {
	const token = c.req.header("Authorization")?.match(/^Bearer (.+)$/)?.[1];
	if (!token || token.length > 200)
		return c.json({ success: false, message: "Please sign in again." }, 401);
	const tokenHash = await hash(token);
	const user = await c.env.DB.prepare(
		"SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
	)
		.bind(tokenHash, Date.now())
		.first<User>();
	if (!user)
		return c.json(
			{
				success: false,
				message: "Your session has expired. Please sign in again.",
			},
			401,
		);
	c.set("user", user);
	c.set("tokenHash", tokenHash);
	await next();
});
app.get("/api/me/profile", (c) =>
	c.json({
		success: true,
		message: "Profile loaded.",
		data: profile(c.get("user")),
	}),
);
app.put("/api/me/profile", async (c) => {
	const body = await c.req.json().catch(() => null);
	const user = c.get("user");
	const firstName =
		typeof body?.firstName === "string" ? body.firstName.trim() : "";
	const lastName =
		typeof body?.lastName === "string" ? body.lastName.trim() : "";
	const matric =
		typeof body?.matricNumber === "string"
			? body.matricNumber.trim().toUpperCase()
			: "";
	if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80)
		return c.json(
			{
				success: false,
				message:
					"First and last names are required (maximum 80 characters each).",
			},
			400,
		);
	if (user.role === "student" && !/^[A-Z]{3}\/\d{4}\/\d{3}$/.test(matric))
		return c.json(
			{ success: false, message: "Use the matric number format ABC/2024/001." },
			400,
		);
	if (user.role === "student") {
		const existing = await c.env.DB.prepare(
			"SELECT id FROM users WHERE matric_number=? AND id<>?",
		)
			.bind(matric, user.id)
			.first();
		if (existing)
			return c.json(
				{
					success: false,
					message: "That matric number is already registered.",
				},
				409,
			);
	}
	try {
		await c.env.DB.prepare(
			"UPDATE users SET first_name=?,last_name=?,matric_number=? WHERE id=?",
		)
			.bind(
				firstName,
				lastName,
				user.role === "student" ? matric : null,
				user.id,
			)
			.run();
	} catch (error) {
		if (String(error).includes("UNIQUE"))
			return c.json(
				{
					success: false,
					message: "That matric number is already registered.",
				},
				409,
			);
		throw error;
	}
	return c.json({
		success: true,
		message: "Profile saved.",
		data: profile({
			...user,
			first_name: firstName,
			last_name: lastName,
			matric_number: user.role === "student" ? matric : null,
		}),
	});
});
app.post("/api/me/logout", async (c) => {
	await c.env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?")
		.bind(c.get("tokenHash"))
		.run();
	return c.json({ success: true, message: "Signed out." });
});
app.notFound((c) =>
	c.json({ success: false, message: "Endpoint not found." }, 404),
);
app.onError((error, c) => {
	logger.error({ msg: "API request failed", service: "api", error });
	return c.json(
		{
			success: false,
			message: "The server could not complete this request. Please try again.",
		},
		500,
	);
});
export default app;
