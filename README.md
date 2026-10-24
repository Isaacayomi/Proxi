# Proxi

### Proximity Based Attendance System

Proxi is a SWEP project designed to simplify classroom attendance through proximity. It brings together a mobile app and an authentication API to connect lecturers and students using Bluetooth Low Energy between smartphones.

Lecturers manage attendance sessions for their courses from their phones, while students use their phones to discover nearby sessions and record their presence. Proxi organizes attendance records into a clear history and provides CSV exports for reporting.

## Features

- **Email verification:** Passwordless sign-in using a six-digit, time-limited email code.
- **Student and lecturer dashboards:** Dedicated interfaces for each role, with attendance summaries and profile details.
- **Attendance sessions:** Course-based sessions with a course code, course name, and attendance window.
- **Proximity-based check-in:** Classroom attendance exchanged between nearby phones over BLE (lecturer advertises, students discover and check in).
- **Attendance history:** Locally stored records with date filtering and refresh controls.
- **CSV exports:** Attendance lists prepared for sharing and spreadsheet use.
- **Profile management:** Server-backed names and student matriculation numbers.
- **Persistent sign-in:** Securely stored mobile sessions, session expiry, and sign-out.

## Attendance workflow

1. A lecturer signs in and creates a session for a course (session is created and validated by the backend).
2. The lecturer's phone advertises the session over Bluetooth Low Energy.
3. Students sign in, scan for nearby sessions, validate against the backend, and check in.
4. Attendance submissions associate each student’s name and matriculation number with the session and recording time; the backend enforces duplicate prevention and session validity.
5. The lecturer retrieves the attendance list and exports it as CSV.

The authentication API handles account verification, session management, and profiles. The mobile app provides the interface, BLE discovery/advertising, and local attendance storage.

## User roles

| Role | Responsibilities |
| --- | --- |
| Student | Maintain a profile and matriculation number, discover nearby sessions, check in, and view personal attendance history. |
| Lecturer | Set up course attendance sessions, advertise sessions over BLE, review collected records, and export attendance lists. |

## Technology stack

| Layer | Technologies |
| --- | --- |
| Mobile application | React Native, Expo (SDK 57), TypeScript |
| Interface | React Native Paper, Expo Vector Icons, React Native Safe Area Context |
| Local attendance storage | Expo SQLite |
| Secure session storage | Expo SecureStore |
| File export and sharing | Expo FileSystem, Expo Sharing |
| BLE | expo-ble-kit (requires a development build; not supported in Expo Go) |
| Authentication API | Hono, TypeScript, Cloudflare Workers |
| Account and authentication data | Cloudflare D1 |
| Email delivery | Resend |
| Validation and testing | TypeScript, ESLint, Biome, Jest, Node.js test runner |

## Project structure

```text
.
├── mobile-app/     # Mobile interface, authentication client, BLE, and local storage
├── auth-server/    # Authentication API, profiles, attendance sessions/records, and database migrations
└── docs/           # Deployment and release documentation
```

## Project setup

### Prerequisites

- Node.js **24 LTS** and npm.
- pnpm **9.6.0** for the auth server.
- Expo SDK **57** development build (EAS/dev client). Expo Go is not sufficient for BLE functionality.
- A Resend account and API key for OTP email delivery.

Install pnpm if needed:

```bash
npm install --global pnpm@9.6.0
```
