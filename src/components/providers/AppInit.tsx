"use client";

import { useEffect, useState, useCallback } from "react";
import { seedDatabase } from "@/lib/seed";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/logger";

type InitState = "pending" | "ready" | "error";

/**
 * AppInit gates the rest of the React tree behind a one-time
 * database seed. Two correctness rules enforced here:
 *
 *   1. Children do NOT mount until seed completes. A previous
 *      version rendered both the loading overlay and `{children}`
 *      from the first frame, which let child components fire
 *      `useLiveQuery(db.x.toArray())` against a half-seeded DB
 *      and render with undefined/partial data.
 *
 *   2. The 2-second timeout that silently swallowed a slow seed
 *      has been removed. If `seedDatabase()` rejects, we now show
 *      an explicit error UI with a retry button instead of
 *      pretending the app is ready and rendering a broken state.
 */
export function AppInit({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [state, setState] = useState<InitState>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The effect body runs the seed once on mount. The `cancelled` flag
  // guards against state updates after unmount, which would warn in
  // dev. The retry handler is a separate function triggered by user
  // click, so the React 19 `set-state-in-effect` lint rule does not
  // fire on the mount path.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState("pending");
      setErrorMessage(null);
      try {
        await seedDatabase();
        if (!cancelled) setState("ready");
      } catch (error) {
        if (cancelled) return;
        logError("Failed to initialize database", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown initialization error"
        );
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = useCallback(async () => {
    setState("pending");
    setErrorMessage(null);
    try {
      await seedDatabase();
      setState("ready");
    } catch (error) {
      logError("Failed to initialize database", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown initialization error"
      );
      setState("error");
    }
  }, []);

  if (state === "ready") {
    return <>{children}</>;
  }

  if (state === "error") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6"
      >
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-2xl font-bold">
            !
          </div>
          <h2 className="text-lg font-semibold">{t("common.initErrorTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("common.initErrorDesc")}
          </p>
          {errorMessage && process.env.NODE_ENV !== "production" && (
            <p className="text-xs text-muted-foreground/70 font-mono break-all">
              {errorMessage}
            </p>
          )}
          <Button onClick={handleRetry} className="mt-2">
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // state === "pending"
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">
          {t("common.loadingData")}
        </p>
      </div>
    </div>
  );
}
