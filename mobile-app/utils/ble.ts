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
      return await (BleManager as any).requestPermissionsAsync({ scan: true, connect: true, advertise: true });
    }
  } catch {}
  return null;
};

export const startLecturerAdvertising = async (sessionId: string, sessionToken: string) => {
  await stopLecturerAdvertising();
  try {
    const adv = await (BleManager as any).startAdvertising(
      {
        localName: "Proxi",
        serviceUUIDs: [PROXI_SERVICE_UUID],
        manufacturerData: {
          companyId: 0xFFFF,
          data: Buffer.from(JSON.stringify({ s: sessionId, t: sessionToken })),
        },
      },
      { connectable: true },
    );
    currentAdvertisement = adv || null;
    return currentAdvertisement;
  } catch (e) {
    throw e;
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
  timeoutMs = 10000,
): Promise<() => void> => {
  try {
    await requestBlePermissions();
  } catch {}
  try {
    const session = (BleManager as any).startScan(
      {
        services: [PROXI_SERVICE_UUID],
      },
      (results: any[]) => {
        if (!results || results.length === 0) return;
        for (const r of results) {
          const md = r.manufacturerData;
          if (md) {
            try {
              const entries = typeof md === "object" ? Object.values(md) : [];
              for (const v of entries) {
                if (v instanceof Uint8Array || Array.isArray(v)) {
                  const buf = Buffer.from(v as any);
                  try {
                    const parsed = JSON.parse(buf.toString());
                    if (parsed?.s || parsed?.sessionId) {
                      onFound({
                        sessionId: parsed.s || parsed.sessionId,
                        sessionToken: parsed.t || parsed.sessionToken,
                        id: r.id,
                        name: r.name,
                        rssi: r.rssi,
                      });
                      return;
                    }
                  } catch {}
                }
              }
            } catch {}
          }
        }
      },
      () => {},
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
  } catch {
    return () => {};
  }
};
