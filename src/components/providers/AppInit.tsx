"use client";

import { useEffect, useState } from "react";
import { seedDatabase } from "@/lib/seed";
import { useT } from "@/lib/i18n";

export function AppInit({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Removed rogue service worker unregistration loop to restore offline PWA capabilities.

    async function init() {
      try {
        // Race condition: if seedDatabase hangs, we timeout after 2 seconds
        await Promise.race([
          seedDatabase(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Seed timeout')), 2000))
        ]);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Failed to initialize database", error);
        }
      } finally {
        setIsInitialized(true);
      }
    }
    init();
  }, []);

  return (
    <>
      {!isInitialized && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">{t("common.loadingData")}</p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
