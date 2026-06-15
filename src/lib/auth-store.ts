import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dexieAuthJSONStorage } from "./auth-storage";

/**
 * SECURITY MODEL & LIMITATIONS
 * =============================
 * MoniKu is a local-first PWA. There is no server. The lockout state
 * here is a UX defense against casual local attacks, not a security
 * boundary in the cryptographic sense.
 *
 * What this lockout does:
 *   - Count failed PIN attempts across sessions.
 *   - Block further PIN entry until the lockout window expires.
 *   - Apply progressive backoff so casual attackers give up.
 *
 * What it does NOT do:
 *   - Survive clearing site data. Browser DevTools → Application →
 *     IndexedDB → delete `FinTrackDB` resets failedAttempts and
 *     lockoutUntil instantly. The previous fix (commit 4f863bf)
 *     moved the state out of localStorage, but IndexedDB is
 *     user-clearable in the same way. A determined attacker with
 *     physical access to an unlocked device can always wipe the
 *     state.
 *   - Survive reinstall. PWAs that are uninstalled (or whose
 *     appData is cleared in browser settings) lose the lockout.
 *   - Cross-device sync. Each device has its own counter. Five
 *     failed attempts on phone A do not lock phone B.
 *
 * What would a real fix look like:
 *   - A server-side rate limiter keyed to the user account. MoniKu
 *     has no accounts today, so this is out of scope.
 *   - A hardware-backed monotonic counter (e.g. Android KeyStore's
 *     `setBlobStorageEncryption` or iOS Secure Enclave). We could
 *     store the failed-attempt counter in a non-extractable HMAC
 *     key derived from the PIN, but the PIN is also wiped when
 *     site data is cleared, so the counter would be re-derivable
 *     from scratch on a clean install.
 *
 * Conclusion: the lockout is meaningful only against a casual
 * thief who picks up an unlocked phone and tries a few PINs. It is
 * not meaningful against a motivated attacker with DevTools. The
 * PIN itself is the actual security boundary — keep it strong (4
 * digits is a 10^4 keyspace, PBKDF2-bounded, but still brute-
 * forceable in minutes with offline hash access).
 */

interface AuthState {
  isAppLocked: boolean;
  pinHash: string | null;
  pinSalt: string | null;
  isBiometricEnabled: boolean;
  credentialId: string | null;
  isUnlockedSession: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;

  // Actions
  setAppLocked: (locked: boolean) => void;
  setPinData: (hash: string | null, salt: string | null) => void;
  setBiometricEnabled: (enabled: boolean, credentialId?: string) => void;
  unlockSession: () => void;
  lockSession: () => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
}

/**
 * Progressive lockout schedule (seconds). Each entry is the wait
 * applied when the failed-attempt counter reaches the corresponding
 * index. Indexed by `attempts - 1` (so index 4 = the 5th failure).
 *
 *   5 fails → 30 s
 *   6 fails → 1 min
 *   7 fails → 5 min
 *   8 fails → 15 min
 *   9 fails → 1 hour
 *   10+    → 24 hours (cap)
 *
 * Doubling past 9 attempts would reach weeks/months quickly. The 24
 * hour cap keeps the user recoverable (a typo in the morning does
 * not lock them out for a month) while still making manual brute
 * force impractical.
 */
const LOCKOUT_SCHEDULE_MS: readonly number[] = [
  0,             // attempts=0 (no lockout)
  0,             // 1
  0,             // 2
  0,             // 3
  0,             // 4 (last free attempt)
  30 * 1000,     // 5
  60 * 1000,     // 6
  5 * 60 * 1000, // 7
  15 * 60 * 1000,// 8
  60 * 60 * 1000,// 9
  24 * 60 * 60 * 1000, // 10+
];

/**
 * Returns the lockout duration for a given attempt count, or 0 if
 * no lockout applies. Counts beyond the schedule cap at the last
 * entry.
 */
export function lockoutDurationFor(attempts: number): number {
  if (attempts < 1) return 0;
  const idx = Math.min(attempts - 1, LOCKOUT_SCHEDULE_MS.length - 1);
  // 0 for index 0..4 (no lockout), positive for index 5+
  return LOCKOUT_SCHEDULE_MS[idx];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAppLocked: false,
      pinHash: null,
      pinSalt: null,
      isBiometricEnabled: false,
      credentialId: null,
      isUnlockedSession: false,
      failedAttempts: 0,
      lockoutUntil: null,

      setAppLocked: (locked) => set({ isAppLocked: locked, isUnlockedSession: !locked }),
      setPinData: (hash, salt) => set({ pinHash: hash, pinSalt: salt }),
      setBiometricEnabled: (enabled, credId) => set({ isBiometricEnabled: enabled, credentialId: credId || null }),
      unlockSession: () => set({ isUnlockedSession: true, failedAttempts: 0, lockoutUntil: null }),
      lockSession: () => set({ isUnlockedSession: false }),
      incrementFailedAttempts: () => set((state) => {
        const attempts = state.failedAttempts + 1;
        const duration = lockoutDurationFor(attempts);
        if (duration > 0) {
          return { failedAttempts: attempts, lockoutUntil: Date.now() + duration };
        }
        return { failedAttempts: attempts };
      }),
      resetFailedAttempts: () => set({ failedAttempts: 0, lockoutUntil: null }),
    }),
    {
      name: "auth-storage",
      // Persist via IndexedDB instead of localStorage to reduce XSS
      // exfiltration surface. See lib/auth-storage.ts for the migration
      // shim that moves any pre-existing localStorage entry on first read.
      storage: dexieAuthJSONStorage,
      partialize: (state) => ({
        isAppLocked: state.isAppLocked,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        isBiometricEnabled: state.isBiometricEnabled,
        credentialId: state.credentialId,
        failedAttempts: state.failedAttempts,
        lockoutUntil: state.lockoutUntil,
      }),
    }
  )
);
