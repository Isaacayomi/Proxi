import * as SecureStore from "expo-secure-store";
import { type AuthSession, isUserProfile } from "./api";
const KEY = "proxi.auth.v1";
export const saveSession = (session: AuthSession) =>
  SecureStore.setItemAsync(KEY, JSON.stringify(session));
export const clearSession = () => SecureStore.deleteItemAsync(KEY);
export async function readSession(): Promise<AuthSession | null> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (
      typeof session.token === "string" &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Date.now() &&
      isUserProfile(session.user)
    )
      return session;
  } catch {
    /* Invalid saved state is cleared below. */
  }
  await clearSession();
  return null;
}
