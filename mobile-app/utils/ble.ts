import { BleManager } from "expo-ble-kit";
import type { Advertisement } from "expo-ble-kit";

const PROXI_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";

export const PROXI_SERVICE = PROXI_SERVICE_UUID;

export type ProxiSessionAd = {
  sessionId: string;
  sessionToken?: string;
};

let currentAdvertisement: Advertisement | null = null;

export const requestBlePermissions = async () => {
  try {
    if ((BleManager as any).requestPermissionsAsync) {
      const perms = await (BleManager as any).requestPermissionsAsync({
        scan: true,
        connect: true,
        advertise: true,
      });
      if (perms) {
        const denied = [];
        if (perms.advertise === "denied") denied.push("advertise");
        if (perms.scan === "denied") denied.push("scan");
        if (perms.connect === "denied") denied.push("connect");
        if (denied.length > 0) {
          throw new Error(
            `Bluetooth permissions denied (${denied.join(", ")}). Grant Nearby devices/Bluetooth permissions in Settings.`,
          );
        }
      }
      return perms;
    }
  } catch (e: any) {
    if (e?.message?.includes("denied")) throw e;
    console.log("[Proxi BLE] Permission request error:", e?.message);
    throw new Error(e?.message || "Failed to request Bluetooth permissions");
  }
  return null;
};

export const getBleState = () => {
  try {
    if (typeof (BleManager as any).state !== "undefined") {
      return (BleManager as any).state;
    }
  } catch {}
  return null;
};

export const startLecturerAdvertising = async (sessionId: string, sessionToken: string) => {
  await stopLecturerAdvertising();

  try {
    await requestBlePermissions();
  } catch (e: any) {
    throw e;
  }

  const state = getBleState();
  if (state === "poweredOff") {
    throw new Error("Bluetooth is turned off. Enable Bluetooth and try again.");
  }
  if (state === "unsupported") {
    throw new Error("Bluetooth is not supported on this device.");
  }

  try {
    const adv = await (BleManager as any).startAdvertising(
      {
        localName: "Proxi",
        serviceUUIDs: [PROXI_SERVICE_UUID],
      },
      { connectable: true },
    );
    currentAdvertisement = adv || null;
    return currentAdvertisement;
  } catch (e: any) {
    console.log("[Proxi BLE] Advertising error:", e?.code || e?.message);
    const msg = e?.message || String(e);
    if (msg.includes("ADVERTISING_FAILED") || msg.includes("busy") || msg.includes("already")) {
      throw new Error("Advertising failed. Try again or check Bluetooth settings.");
    }
    if (msg.includes("NOT_SUPPORTED")) {
      throw new Error("Advertising not supported on this device.");
    }
    if (msg.includes("denied")) {
      throw new Error("Bluetooth advertise permission denied. Grant permissions in Settings.");
    }
    throw new Error(msg);
  }
};

export const stopLecturerAdvertising = async () => {
  try {
    if (currentAdvertisement && typeof currentAdvertisement.stop === "function") {
      await currentAdvertisement.stop();
    }
    currentAdvertisement = null;
  } catch {
    currentAdvertisement = null;
  }
};

export const scanForProxiSessions = async (
  onFound: (ad: ProxiSessionAd & { id: string; name?: string | null; rssi?: number }) => void,
  timeoutMs = 15000,
): Promise<() => void> => {
  try {
    await requestBlePermissions();
  } catch (e: any) {
    throw e;
  }

  const state = getBleState();
  if (state === "poweredOff") {
    throw new Error("Bluetooth is turned off. Enable Bluetooth and try again.");
  }
  if (state === "unsupported") {
    throw new Error("Bluetooth is not supported on this device.");
  }

  try {
    const session = (BleManager as any).startScan(
      {
        services: [PROXI_SERVICE_UUID],
      },
      (results: any[]) => {
        if (!results || results.length === 0) return;
        for (const r of results) {
          if (r.serviceUUIDs?.includes(PROXI_SERVICE_UUID) || r.name === "Proxi") {
            onFound({
              sessionId: r.id,
              sessionToken: undefined,
              id: r.id,
              name: r.name,
              rssi: r.rssi,
            });
            return;
          }
        }
      },
      (err: any) => {
        console.log("[Proxi BLE] Scan error:", err?.message);
      },
    );
    const timer = setTimeout(() => {
      try {
        session?.stop?.();
      } catch {}
    }, timeoutMs);
    return () => {
      clearTimeout(timer);
      try {
        session?.stop?.();
      } catch {}
    };
  } catch (e: any) {
    console.log("[Proxi BLE] Start scan error:", e?.message);
    throw new Error(e?.message || "Failed to start scanning");
  }
};
