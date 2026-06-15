import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dexieAuthJSONStorage } from "./auth-storage";

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
        if (attempts >= 5) {
          return { failedAttempts: attempts, lockoutUntil: Date.now() + 30 * 1000 };
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
