import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { db } from "./db";

/**
 * Dexie-backed StateStorage adapter for Zustand `persist` middleware.
 *
 * Replaces the default `localStorage` backend for the auth store so that
 * sensitive material (PIN hash, salt, lockout state, biometric
 * credentialId) is not exposed via `localStorage` — which is readable
 * by any script on the origin and is a common XSS exfiltration target.
 *
 * IndexedDB is per-origin and the `security` table is intentionally
 * kept out of the public Dexie schema exports (see `lib/db.ts` v3) so
 * analytics code does not accidentally read from it.
 *
 * One-time migration: on first read, if a stale entry exists in
 * `localStorage` under the same key, it is moved to IndexedDB and
 * the localStorage entry is deleted. This is forward-only — the
 * migration runs at most once per user.
 */
export const dexieAuthStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;

    // One-time migration from localStorage → IndexedDB.
    // Wrapped in try/catch: if localStorage is disabled (private mode)
    // or the entry is unparseable, fall through to Dexie read.
    try {
      const lsValue = window.localStorage.getItem(name);
      if (lsValue !== null) {
        await db.security.put({ key: name, value: lsValue });
        window.localStorage.removeItem(name);
        return lsValue;
      }
    } catch {
      // localStorage access denied — proceed to Dexie only.
    }

    const row = await db.security.get(name);
    return row?.value ?? null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    await db.security.put({ key: name, value });
    // Defensive: also clear any straggling localStorage entry with the
    // same key (e.g. from a partial migration in a previous session).
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore.
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await db.security.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore.
    }
  },
};

/**
 * Pre-built JSON storage adapter for `zustand/middleware` `persist`.
 * Use as: `persist(stateFn, { name, storage: dexieAuthJSONStorage })`
 */
export const dexieAuthJSONStorage = createJSONStorage(() => dexieAuthStorage);
