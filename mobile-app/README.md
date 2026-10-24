# Proxi Mobile App

This app targets Expo SDK 57 and requires a development build (EAS/dev client) for Bluetooth Low Energy functionality. Expo Go does not support native BLE modules.

## Features
- Email OTP authentication with persistent sessions
- Student and lecturer dashboards
- Phone-to-phone BLE: lecturer advertises attendance sessions, students discover and check in
- Local attendance storage (Expo SQLite)
- CSV export (Expo FileSystem + Sharing)
- Profile management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment (if needed). See `.env.example`.

3. Run in development build (BLE will not work in Expo Go):
```bash
# For Android dev build
npx expo run:android
# For iOS dev build
npx expo run:ios
# Or use EAS build
eas build --profile preview --platform android
```

## BLE permissions
- **Android**: BLUETOOTH, BLUETOOTH_ADMIN, BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION (API dependent). The app requests runtime permissions.
- **iOS**: NSBluetoothAlwaysUsageDescription (and related). Bluetooth must be enabled on the device.

## Notes
- BLE functionality requires physical devices (emulators/simulators have limited or no BLE support).
- The backend remains authoritative for session validity and attendance; BLE is used for discovery only.
