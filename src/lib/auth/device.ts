"use client";

/**
 * Device Fingerprint & Binding Service for ProxiCheck
 *
 * Web browsers do not expose physical hardware MAC addresses for OS privacy reasons.
 * ProxiCheck enforces academic integrity through Persistent Cryptographic Device Binding:
 * - A persistent, high-entropy unique device ID is generated and stored in localStorage and secure cookies.
 * - Each student account binds strictly to their registered primary device.
 * - Prevents multiple accounts on a single phone (proxy check-in fraud) and prevents
 *   logging in from unverified secondary devices.
 */

const DEVICE_STORAGE_KEY = "proxicheck_device_id";
const DEVICE_COOKIE_NAME = "proxicheck_device_id";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function generateRandomDeviceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "dev-" + crypto.randomUUID();
  }
  return (
    "dev-" +
    Math.random().toString(36).substring(2, 12) +
    "-" +
    Date.now().toString(36)
  );
}

/**
 * Returns the persistent unique device ID for this client.
 * Self-heals across localStorage and cookies.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "dev-server-placeholder";
  }

  let deviceId: string | null = null;

  try {
    deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {
    // LocalStorage blocked
  }

  if (!deviceId) {
    deviceId = getCookie(DEVICE_COOKIE_NAME);
  }

  if (!deviceId) {
    deviceId = generateRandomDeviceId();
  }

  // Persist to both channels to prevent accidental clears
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch {
    // Ignore
  }
  setCookie(DEVICE_COOKIE_NAME, deviceId);

  return deviceId;
}

/**
 * Human-readable description of current client device
 */
export function getDeviceSummary(): {
  platform: string;
  browser: string;
  deviceId: string;
} {
  const deviceId = getOrCreateDeviceId();
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { platform: "Unknown", browser: "Server", deviceId };
  }

  const ua = navigator.userAgent;
  let browser = "Web Browser";
  let platform = "Personal Computer";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = "Apple iOS Device";
  } else if (/Android/i.test(ua)) {
    platform = "Android Phone/Tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = "macOS";
  } else if (/Windows/i.test(ua)) {
    platform = "Windows PC";
  } else if (/Linux/i.test(ua)) {
    platform = "Linux Device";
  }

  if (/Edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Safari/i.test(ua)) {
    browser = "Apple Safari";
  } else if (/Firefox/i.test(ua)) {
    browser = "Mozilla Firefox";
  }

  return { platform, browser, deviceId };
}
