import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SyncState {
  googleToken: string | null;
  lastSyncAt: number | null;
  userEmail: string | null;
  setGoogleToken: (token: string | null) => void;
  setLastSyncAt: (timestamp: number) => void;
  setUserEmail: (email: string | null) => void;
  disconnect: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      googleToken: null,
      lastSyncAt: null,
      userEmail: null,
      setGoogleToken: (token) => set({ googleToken: token }),
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
      setUserEmail: (email) => set({ userEmail: email }),
      disconnect: () => set({ googleToken: null, userEmail: null, lastSyncAt: null }),
    }),
    {
      name: "moniku-sync-storage",
    }
  )
);
