import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAppLocked: boolean;
  pinHash: string | null;
  isBiometricEnabled: boolean;
  credentialId: string | null;
  isUnlockedSession: boolean;
  
  // Actions
  setAppLocked: (locked: boolean) => void;
  setPinHash: (hash: string | null) => void;
  setBiometricEnabled: (enabled: boolean, credentialId?: string) => void;
  unlockSession: () => void;
  lockSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAppLocked: false,
      pinHash: null,
      isBiometricEnabled: false,
      credentialId: null,
      isUnlockedSession: false,
      
      setAppLocked: (locked) => set({ isAppLocked: locked, isUnlockedSession: !locked }),
      setPinHash: (hash) => set({ pinHash: hash }),
      setBiometricEnabled: (enabled, credId) => set({ isBiometricEnabled: enabled, credentialId: credId || null }),
      unlockSession: () => set({ isUnlockedSession: true }),
      lockSession: () => set({ isUnlockedSession: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAppLocked: state.isAppLocked,
        pinHash: state.pinHash,
        isBiometricEnabled: state.isBiometricEnabled,
        credentialId: state.credentialId,
      }),
    }
  )
);
