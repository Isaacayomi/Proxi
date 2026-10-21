# Proxi auth server

The Hono API runs on Cloudflare Workers and uses D1 for accounts, profiles, OTP challenges, throttling, and authenticated sessions. Resend delivers OTP emails. It runs independently of the ESP32.

## Local setup

Use Node.js 24 LTS and pnpm:

```sh
pnpm install
npm run db:migrate
npm run dev -- --local --ip 0.0.0.0
```

Migrations are applied to the local database by the command above. Historical migrations contain table drops: review pending migrations before applying them to existing data. `0003_auth_profiles.sql` only adds the current authentication/profile structure.

If `.dev.vars` does not exist, copy `.dev.vars.example` and set your Resend key. The default test sender only delivers to the Resend account email. Other recipients require a verified sender domain. Never put the key in the mobile app.

## API

All responses contain `success` and `message`, with `data` on successful reads/writes. Errors use appropriate HTTP status codes.

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Health response |
| `POST /api/auth/initiate` | Request an emailed code with `{email}`; returns a challenge `id` |
| `POST /api/auth/complete` | Verify `{id, otp}`; returns `{token, expiresAt, user}` |
| `GET /api/me/profile` | Read the signed-in user's profile |
| `PUT /api/me/profile` | Save `{firstName, lastName, matricNumber?}` |
| `POST /api/me/logout` | Revoke the current session |

The `/api/me/*` routes require `Authorization: Bearer <token>`. Tokens are hashed in D1 and expire after 30 days. OTPs expire after ten minutes, are single-use, and allow at most five verification attempts. Code requests have a resend cooldown and per-email/IP limits. Codes and tokens are not returned in errors or logged.

User IDs remain stable across repeated login. Roles are assigned on the server using the existing rule: student university emails are students; other verified emails are lecturers. Client-supplied role changes are ignored. Profiles are stored on the server, and student matric numbers must be unique.

The Worker no longer requires KV. Existing `KVCache` helper files and legacy Vitest tests remain from the earlier implementation; the current test command runs the active API regression suite.

## Checks

```sh
npm run typecheck
npm test
```

The active suite executes the real Hono routes against an in-memory SQLite implementation of D1 with the full SQL migration chain. Email requests are mocked: tests do not send email or modify local/remote user databases.

For deployment, API secrets, resource IDs, and mobile build configuration, see [the deployment guide](../docs/DEPLOYMENT.md).
