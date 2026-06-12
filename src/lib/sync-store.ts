import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SyncState {
  lastSyncAt: number | null;
  userEmail: string | null;
  setLastSyncAt: (timestamp: number) => void;
  setUserEmail: (email: string | null) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      lastSyncAt: null,
      userEmail: null,
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
      setUserEmail: (email) => set({ userEmail: email }),
    }),
    {
      name: "moniku-sync-storage",
    }
  )
);
