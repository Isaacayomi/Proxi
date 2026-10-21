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

## Getting started

Use Node.js 24 LTS, npm for the mobile app, and pnpm for the auth server. PlatformIO provides the ESP32 build and upload tools.

Follow the component guides for configuration and development commands:

- [Mobile app setup](mobile-app/README.md)
- [Auth server setup and API](auth-server/README.md)
- [ESP32 configuration](esp32/platformio.ini)
- [Deployment and release guide](docs/DEPLOYMENT.md)

## Configuration

The mobile app uses `EXPO_PUBLIC_API_URL` to reach the authentication API. The backend uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for email delivery, plus its Cloudflare D1 database binding.

Example environment files are included in each application folder. Keep actual credentials in local environment files or the hosting platform’s secret storage.

## Project identity

- **Project title:** Proximity Based Attendance System
- **Application name:** Proxi
- **Project context:** SWEP
