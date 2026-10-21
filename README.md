# Proxi

### Proximity Based Attendance System

Proxi is a SWEP project designed to simplify classroom attendance through proximity. It brings together a mobile app, an authentication API, and an ESP32 device to connect lecturers and students using Bluetooth Low Energy.

Lecturers manage attendance sessions for their courses, while students use their phones to record their presence in a nearby classroom. Proxi organizes attendance records into a clear history and provides CSV exports for reporting.

## Features

- **Email verification:** Passwordless sign-in using a six-digit, time-limited email code.
- **Student and lecturer dashboards:** Dedicated interfaces for each role, with attendance summaries and profile details.
- **Attendance sessions:** Course-based sessions with a course code, course name, and attendance window.
- **Proximity-based check-in:** Classroom attendance exchanged between nearby phones and an ESP32 over BLE.
- **Attendance history:** Locally stored records with date filtering and refresh controls.
- **CSV exports:** Attendance lists prepared for sharing and spreadsheet use.
- **Profile management:** Server-backed names and student matriculation numbers.
- **Persistent sign-in:** Securely stored mobile sessions, session expiry, and sign-out.

## Attendance workflow

1. A lecturer signs in and creates a session for a course.
2. The classroom ESP32 makes the session available over Bluetooth.
3. Students sign in, connect to the nearby device, and select their session.
4. Attendance submissions associate each student’s name and matriculation number with the session and recording time.
5. The lecturer retrieves the attendance list and exports it as CSV.

The authentication API handles account verification and profiles. The ESP32 handles local classroom communication, and the mobile app provides the interface and local attendance storage.

## User roles

| Role | Responsibilities |
| --- | --- |
| Student | Maintain a profile and matriculation number, check in to nearby sessions, and view personal attendance history. |
| Lecturer | Set up course attendance sessions, review collected records, and export attendance lists. |

## Technology stack

| Layer | Technologies |
| --- | --- |
| Mobile application | React Native, Expo, TypeScript |
| Interface | React Native Paper, Expo Vector Icons, React Native Safe Area Context |
| Local attendance storage | Expo SQLite |
| Secure session storage | Expo SecureStore |
| File export and sharing | Expo FileSystem, Expo Sharing |
| Authentication API | Hono, TypeScript, Cloudflare Workers |
| Account and authentication data | Cloudflare D1 |
| Email delivery | Resend |
| Classroom device | ESP32, C++, Arduino framework |
| Bluetooth communication | Bluetooth Low Energy, NimBLE-Arduino |
| Firmware tooling | PlatformIO, ArduinoJson |
| Validation and testing | TypeScript, ESLint, Biome, Jest, Node.js test runner |

## Project structure

```text
.
├── mobile-app/     # Mobile interface, authentication client, and local storage
├── auth-server/    # Authentication API, profiles, and database migrations
├── esp32/          # Classroom device firmware and PlatformIO configuration
└── docs/           # Deployment and release documentation
```

## Project setup

### Prerequisites

- Node.js **24 LTS** and npm.
- pnpm **9.6.0** for the auth server.
- Expo Go compatible with **SDK 57** for mobile development.
- A Resend account and API key for OTP email delivery.
- PlatformIO, an ESP32 compatible with the `esp32dev` target, and a USB data cable for firmware development.

Install pnpm if needed:

```
npm install --global pnpm@9.6.0
```

Each command block below starts from the project root. The `cd` command opens the relevant component folder; skip it if your terminal is already in that folder.

### 1. Set up the auth server

```
cd auth-server
pnpm install
# Create local configuration only if it does not already exist.
test -f .dev.vars || cp .dev.vars.example .dev.vars
```

Open `auth-server/.dev.vars` and set:

```env
RESEND_API_KEY=re_your_actual_resend_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

The default Resend test sender delivers only to the email registered with your Resend account. To send to other users, configure a sender address on a domain verified in Resend.

Initialize the local database and start the API:

```
cd auth-server
npm run db:migrate
npm run dev -- --local --ip 0.0.0.0
```

For an existing database, review pending migrations before applying them. The migration command uses the local D1 database configured in `auth-server/wrangler.toml`.

Open `http://localhost:8787/` to check that the API is running. Leave this terminal open while using the app.

### 2. Set up the mobile app

In a separate terminal, starting from the project root:

```
cd mobile-app
npm ci
# Create local configuration only if it does not already exist.
test -f .env.local || cp .env.example .env.local
```

Set the API address in `mobile-app/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8787
```

Replace `YOUR_COMPUTER_LAN_IP` with your computer's local network address, such as `192.168.1.10`. On a physical phone, `localhost` refers to the phone, so use the computer's address. Connect the phone and computer to the same network and allow access to port **8787** through the computer's firewall.

Start Expo:

```
cd mobile-app
npm start -- --clear
```

Scan the QR code with a compatible Expo Go app. Restart Expo after changing `.env.local`. For Bluetooth hardware testing, use a custom Expo development build.

Press **Ctrl+C** in either terminal to stop its server.

### 3. Set up the ESP32 firmware

Install the PlatformIO extension in VS Code or use PlatformIO Core. Connect the ESP32 to your computer with a USB data cable, then run these commands from the project root:

```
cd esp32
# Build the firmware and resolve the libraries in platformio.ini.
pio run -e esp32dev
# Upload to the connected board.
pio run -e esp32dev --target upload
# View device logs.
pio device monitor --baud 115200
```

The project uses the Arduino framework, NimBLE-Arduino, and ArduinoJson. Its Bluetooth advertising name is `ESP32-Attendance`. PlatformIO's Build, Upload, and Serial Monitor actions provide the same workflow inside VS Code.

### 4. Run the checks

Auth server checks:

```
cd auth-server
npm run typecheck
npm test
```

Mobile app checks:

```
cd mobile-app
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo install --check
```

## Configuration and deployment

The mobile app uses `EXPO_PUBLIC_API_URL` to reach the authentication API. The backend uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for email delivery, plus its Cloudflare D1 database binding.

Keep actual credentials in local environment files or the hosting platform's secret storage. Email API keys belong in the backend; `EXPO_PUBLIC_*` values are included in the mobile app.

See the component guides for additional details:

- [Mobile app setup](mobile-app/README.md)
- [Auth server setup and API](auth-server/README.md)
- [ESP32 configuration](esp32/platformio.ini)
- [Deployment and release guide](docs/DEPLOYMENT.md)

## Project identity

- **Project title:** Proximity Based Attendance System
- **Application name:** Proxi
- **Project context:** SWEP
