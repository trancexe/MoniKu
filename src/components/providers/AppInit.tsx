"use client";

import { useEffect, useState } from "react";
import { seedDatabase } from "@/lib/seed";

export function AppInit({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await seedDatabase();
      } catch (error) {
        console.error("Failed to initialize database", error);
      } finally {
        setIsInitialized(true);
      }
    }
    init();
  }, []);

  if (!isInitialized) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
