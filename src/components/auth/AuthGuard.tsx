"use client";

import { useAuthStore } from "@/lib/auth-store";
import { AppLock } from "./AppLock";
import { useEffect, useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAppLocked, isUnlockedSession } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null; // Or a simple spinner / splash screen
  }

  // If App Lock is enabled and we haven't unlocked this session, show App Lock
  if (isAppLocked && !isUnlockedSession) {
    return <AppLock />;
  }

  return <>{children}</>;
}
