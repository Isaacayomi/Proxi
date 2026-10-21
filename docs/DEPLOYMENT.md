# Proxi deployment

The mobile app and auth API are prepared for non-Bluetooth testing. This guide publishes the auth API and produces an installable Android app. No ESP32 is needed for login, profile setup/editing, navigation, local history, or sign-out. Creating classroom sessions and submitting attendance remain unavailable until BLE integration is added.

## 1. Email delivery

Create a Resend sending API key. During testing, `onboarding@resend.dev` can only deliver to the email associated with your Resend account. Delivery to other users requires a verified sender domain and a sender email on that domain. A deployed server does not remove this restriction.

Reference: https://resend.com/docs/knowledge-base/403-error-resend-dev-domain

## 2. Deploy the auth API

Use Node.js 24 LTS. From `auth-server/`:

```sh
pnpm install
npm run typecheck
npm test
npx wrangler login
```

The checked-in `wrangler.toml` retains legacy resource names and a database ID. Use your own Cloudflare account and database. For a new database:

```sh
npx wrangler d1 create proxi-db
```

Copy the returned database ID into the `DB` binding in `wrangler.toml`, set `database_name` to your database's name, and optionally choose a unique Worker `name`. The binding must remain `DB`, and `migrations_dir` must remain `src/database/migrations`.

Review pending migrations first:

```sh
npx wrangler d1 migrations list proxi-db --remote
```

For a new empty database, initialize it using the migration chain:

```sh
npx wrangler d1 migrations apply proxi-db --remote
```

For an existing database, use its actual name. Review and back up existing data before applying pending migrations. Historical migrations `0001` and `0002` remove old tables/columns. Migration `0003_auth_profiles.sql` adds profiles, login challenges, rate limits, and sessions without dropping existing data. Do not rerun historical SQL manually against an initialized database.

Set the API key using Wrangler's secret prompt (do not place the key in a shell command or in mobile configuration):

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npm run deploy
```

Use `onboarding@resend.dev` as the sender for account-only testing, or your verified sender address for real users. `.dev.vars` is local configuration and is not a substitute for deployed Worker secrets.

Save the HTTPS Worker URL printed by deployment. Opening its `/` endpoint should return the Proxi health response. KV is no longer needed; authentication state is stored in D1.

Optional `ALLOWED_ORIGIN` configuration is only relevant to a future browser client. Native mobile requests do not require browser CORS permission.

Reference: https://developers.cloudflare.com/workers/wrangler/commands/d1/

## 3. Configure and build the mobile app

From `mobile-app/`:

```sh
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo install --check
npx eas-cli login
npx eas-cli init
```

Link to your Expo account/project when prompted. The app identifiers default to `com.proxi.attendance`; choose identifiers belonging to your project before your first store release.

In the linked Expo project's environment variables, add `EXPO_PUBLIC_API_URL` with the deployed HTTPS Worker URL for both **preview** and **production** environments. This is a public URL, not a secret. Do not add the email API key to Expo.

For a local configuration check:

```sh
EXPO_PUBLIC_API_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev npm run check:release
```

Build a shareable Android APK:

```sh
npx eas-cli build --platform android --profile preview
```

The `preview` build is a release app with developer dashboard shortcuts hidden. It uses your hosted API and does not need Expo Go, Metro, or your laptop running. The build hook rejects missing, local-network, or non-HTTPS API URLs. Changing the API URL requires rebuilding the app.

For a Play Store Android App Bundle:

```sh
npx eas-cli build --platform android --profile production
```

The production profile increments the native app version code automatically. An iOS build requires the corresponding Apple signing/account setup.

References: https://docs.expo.dev/build/eas-json/ and https://docs.expo.dev/eas/environment-variables/manage/

## 4. Verify on physical phones

Before distributing broadly, test on a physical device with the hosted API:

1. Request a code, verify it, and complete the server-backed profile.
2. Sign out and sign back in: the same profile and account must return.
3. Edit the profile and reopen the app: the saved values must persist.
4. Request another code, use a wrong code, and change the login email.
5. Restart the app offline: a valid saved session can show cached profile/local records. Profile edits and sign-out require reaching the API. After session expiry, login is required.
6. Confirm role-specific navigation and clear unavailable attendance controls.
7. Confirm a release APK has no UI-preview login shortcuts.

The retained role policy assigns `@student.oauife.edu.ng` emails to students and all other verified emails to lecturers. This is the existing requested routing rule; there is no separate lecturer approval process.

Attendance history is local to each phone; cloud attendance sync and the optional features previously discussed have not been added. CSV sharing can be verified once actual attendance records are available.

## What remains

- Configure your Cloudflare resources, Resend sender/key, and the real HTTPS API URL.
- Build/install the APK and complete the physical-device checks above. Local automated checks and bundle exports do not replace device testing.
- When the board arrives, fix/test the ESP32 firmware, restore the BLE transport, and create a custom Expo development build for hardware testing. Expo Go cannot load the BLE library.
