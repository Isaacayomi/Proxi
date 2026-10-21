# Proxi mobile app

This app targets Expo SDK 57 and runs in Expo Go 57 (including 57.0.9). Bluetooth is deferred: connection and attendance actions that require the ESP32 are disabled. Local attendance storage uses Expo SQLite, and CSV export uses Expo FileSystem and Sharing.

## Run

Use Node.js 24 LTS and npm:

```sh
npm ci
npm start -- --clear
```

Install the Expo Go version matching the SDK in `package.json` (see https://expo.dev/go), connect your phone and computer to the same network, then scan the terminal QR code. The login screen has development-only **Preview student dashboard** and **Preview lecturer dashboard** buttons. These do not authenticate or persist a signed-in session; log out to return to login.

For real authentication, copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to `http://<computer-LAN-IP>:8787`. `localhost` on a phone refers to the phone, not your computer. Restart Expo after changing the environment file. This URL is public app configuration; do not put secrets in it.

Start the independent auth server using the instructions in `../auth-server/README.md`. The ESP32 is only needed for future Bluetooth attendance operations.

## Interface

The Proxi interface uses light neutral backgrounds, emerald accents, rounded cards, and a floating bottom bar. Both roles can navigate between Home, Attendance, History, and Profile. Counts and history come from locally saved records; date filtering, refresh, profile details, and sign-out work without Bluetooth. Lecturer history supports CSV sharing. Bluetooth attendance and session creation remain disabled.

## Checks

```sh
npm run typecheck
npx expo install --check
npx expo export --platform android --output-dir /tmp/proxi-export
```

The native `android/` and `ios/` projects are not used by Expo Go. Future Bluetooth support will require a development build, a compatible BLE library, and native permissions/config plugins.

## Authentication and release builds

The backend now issues authenticated sessions and stores the profile. Session tokens and the cached profile use Expo SecureStore. Restoring a valid saved session can show cached data offline; profile changes and sign-out require the API. Expired/revoked sessions return to login. OTP entry includes resend cooldown and change-email controls. Profile editing is available from the Profile tab.

The backend assigns the role using the retained email-domain rule. The old local `userId`/name keys do not grant access to the app.

`eas.json` defines an internal Android APK and a production app-store build. Set `EXPO_PUBLIC_API_URL` in the matching EAS environment before building. The release check rejects a missing or local HTTP API URL. Developer preview buttons are hidden in release builds. See [deployment instructions](../docs/DEPLOYMENT.md).
# Proxi
