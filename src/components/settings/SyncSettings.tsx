"use client";

import { useState, useRef, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
import { uploadBackup, downloadBackup, getUserEmail, getFreshAccessToken } from "@/lib/gdrive";
import { exportAllData, importAllData, downloadJsonFile } from "@/lib/sync-utils";
import { useSyncStore } from "@/lib/sync-store";
import { isIOSPWA, are3rdPartyCookiesBlocked } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import dayjs from "dayjs";
import { useT } from "@/lib/i18n";

export function SyncSettings() {
  const t = useT();
  const { userEmail, lastSyncAt, setLastSyncAt, setUserEmail } = useSyncStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isLocalRestoreDialogOpen, setIsLocalRestoreDialogOpen] = useState(false);
  const [localRestoreData, setLocalRestoreData] = useState<Record<string, unknown> | null>(null);
  const showIOSPWANotice = useSyncExternalStore(emptySubscribe, () => isIOSPWA(), () => false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const hasClientId = clientId.length > 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationInProgress = useRef(false);

  function handleGisError(err: unknown, operation: "backup" | "restore") {
    const error = err as Record<string, unknown>;
    const errorType = error?.type || error?.message;

    if (errorType === "popup_closed" || String(errorType).includes("closed")) {
      toast.info(t("sync.cancelled"));
    } else if (errorType === "access_denied") {
      toast.error(t("sync.denied"));
    } else if (String(errorType).includes("popup_failed_to_open")) {
      toast.error(t("sync.popupBlocked"));
    } else if (String(errorType).includes("Cookies")) {
      toast.error(t("sync.cookieBlockedWarning"));
    } else if (String(errorType).includes("not loaded")) {
      toast.error(t("sync.gisNotLoaded"));
    } else {
      const msg = operation === "backup"
        ? t("sync.backupFailed")
        : t("sync.restoreFailed");
      toast.error(msg);
      if (process.env.NODE_ENV !== "production") {
        console.error(`${operation} error:`, error);
      }
    }
  }

  // --- GOOGLE DRIVE HANDLERS ---

  const handleDriveBackup = async () => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setIsLoading(true);

    try {
      const token = await getFreshAccessToken(clientId);
      await uploadBackup(token);
      setLastSyncAt(Date.now());

      getUserEmail(token).then(email => {
        if (email) setUserEmail(email);
      }).catch(() => {});

      toast.success(t("sync.backupSuccess"));
    } catch (error: unknown) {
      handleGisError(error, "backup");
    } finally {
      operationInProgress.current = false;
      setIsLoading(false);
    }
  };

  const handleDriveRestoreClick = () => {
    if (operationInProgress.current) return;
    setIsRestoreDialogOpen(true);
  };

  const executeDriveRestore = async () => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setIsRestoreDialogOpen(false);
    setIsLoading(true);

    try {
      const token = await getFreshAccessToken(clientId);
      await downloadBackup(token);
      setLastSyncAt(Date.now());
      toast.success(t("sync.restoreSuccess"));
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: unknown) {
      handleGisError(error, "restore");
    } finally {
      operationInProgress.current = false;
      setIsLoading(false);
    }
  };

  // --- LOCAL FILE HANDLERS ---

  const handleLocalBackup = async () => {
    try {
      setIsLoading(true);
      const data = await exportAllData();
      const filename = `moniku_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
      downloadJsonFile(data, filename);
      toast.success(t("sync.localBackupSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("sync.exportFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalRestoreSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result as string;
        const data = JSON.parse(jsonString);

        if (!data.wallets && !data.categories && !data.transactions) {
          throw new Error("Invalid backup file format");
        }

        setLocalRestoreData(data);
        setIsLocalRestoreDialogOpen(true);
      } catch (error) {
        console.error(error);
        toast.error(t("sync.localRestoreInvalid"));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const executeLocalRestore = async () => {
    if (!localRestoreData) return;
    setIsLocalRestoreDialogOpen(false);
    setIsLoading(true);
    try {
      await importAllData(localRestoreData);
      toast.success(t("sync.localRestoreSuccess"));
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      toast.error(t("sync.localRestoreFailed"));
    } finally {
      setIsLoading(false);
      setLocalRestoreData(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Google Drive Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icons.Cloud className="h-5 w-5" />
          {t("sync.cloudTitle")}
        </h3>

        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          {showIOSPWANotice && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300"
            >
              <strong>Catatan:</strong> {t("sync.iosNotice")}
            </div>
          )}

          {are3rdPartyCookiesBlocked() && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300"
            >
              <strong>Peringatan:</strong> {t("sync.cookieBlockedWarning")}
            </div>
          )}

          {!hasClientId && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300"
            >
              <strong>Peringatan:</strong> {t("sync.clientIdWarning")}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {t("sync.cloudDesc")}
          </p>

          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              {t("sync.lastSync", { date: dayjs(lastSyncAt).format("D MMM YYYY, HH:mm") })}
            </p>
          )}

          {userEmail && (
            <p className="text-xs text-muted-foreground">
              {t("sync.account", { email: userEmail })}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleDriveBackup}
              disabled={isLoading || !hasClientId || showIOSPWANotice}
              aria-describedby={showIOSPWANotice || !hasClientId ? "sync-notice" : undefined}
              variant="default"
              className="flex-1"
            >
              {t("sync.backup")}
            </Button>
            <Button
              onClick={handleDriveRestoreClick}
              disabled={isLoading || !hasClientId || showIOSPWANotice}
              aria-describedby={showIOSPWANotice || !hasClientId ? "sync-notice" : undefined}
              variant="secondary"
              className="flex-1"
            >
              {t("sync.restore")}
            </Button>
          </div>
        </div>
      </div>

      {/* Local File Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icons.HardDrive className="h-5 w-5" />
          {t("sync.localTitle")}
        </h3>
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("sync.localDesc")}
          </p>
          <div className="flex gap-2">
            <Button onClick={handleLocalBackup} disabled={isLoading} variant="outline" className="flex-1 gap-2">
              <Icons.Download className="h-4 w-4" />
              {t("sync.download")}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Icons.Upload className="h-4 w-4" />
              {t("sync.upload")}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalRestoreSelect}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Drive Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sync.restoreConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("sync.restoreConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={executeDriveRestore} disabled={isLoading}>
              {t("sync.confirmOverwrite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Local File Restore Dialog */}
      <Dialog open={isLocalRestoreDialogOpen} onOpenChange={setIsLocalRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sync.localRestoreConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("sync.localRestoreConfirmDesc")}
              {localRestoreData && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm text-left">
                  <p><strong>{t("sync.statsTitle")}:</strong></p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>{t("sync.statsTransactions", { count: Array.isArray(localRestoreData.transactions) ? localRestoreData.transactions.length : 0 })}</li>
                    <li>{t("sync.statsWallets", { count: Array.isArray(localRestoreData.wallets) ? localRestoreData.wallets.length : 0 })}</li>
                    <li>{t("sync.statsCategories", { count: Array.isArray(localRestoreData.categories) ? localRestoreData.categories.length : 0 })}</li>
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLocalRestoreDialogOpen(false)} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={executeLocalRestore} disabled={isLoading}>
              {t("sync.confirmOverwrite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
