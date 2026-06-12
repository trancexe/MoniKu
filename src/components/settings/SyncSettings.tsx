"use client";

import { useState, useRef, useEffect } from "react";
import { uploadBackup, downloadBackup, getUserEmail, getFreshAccessToken } from "@/lib/gdrive";
import { exportAllData, importAllData, downloadJsonFile } from "@/lib/sync-utils";
import { useSyncStore } from "@/lib/sync-store";
import { isIOSPWA, are3rdPartyCookiesBlocked } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import dayjs from "dayjs";

export function SyncSettings() {
  const { userEmail, lastSyncAt, setLastSyncAt, setUserEmail } = useSyncStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isLocalRestoreDialogOpen, setIsLocalRestoreDialogOpen] = useState(false);
  const [localRestoreData, setLocalRestoreData] = useState<Record<string, unknown> | null>(null);
  const [showIOSPWANotice, setShowIOSPWANotice] = useState(false);
  
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const hasClientId = clientId.length > 0;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationInProgress = useRef(false);
  
  useEffect(() => {
    if (isIOSPWA()) {
      setShowIOSPWANotice(true);
    }
  }, []);
  
  function handleGisError(err: unknown, operation: "backup" | "restore") {
    const error = err as Record<string, unknown>;
    const errorType = error?.type || error?.message;
    
    if (errorType === "popup_closed" || String(errorType).includes("closed")) {
      toast.info("Login dibatalkan");
    } else if (errorType === "access_denied") {
      toast.error("Izin Google Drive ditolak");
    } else if (String(errorType).includes("popup_failed_to_open")) {
      toast.error("Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.");
    } else if (String(errorType).includes("Cookies")) {
      toast.error("Cookie pihak ketiga diblokir. Aktifkan di pengaturan browser.");
    } else if (String(errorType).includes("not loaded")) {
      toast.error("Google Identity Services gagal dimuat. Refresh halaman dan coba lagi.");
    } else {
      const msg = operation === "backup" 
        ? "Gagal backup ke Google Drive" 
        : "Gagal restore dari Google Drive";
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
      
      // Try to fetch email without blocking
      getUserEmail(token).then(email => {
        if (email) setUserEmail(email);
      }).catch(() => {});
      
      toast.success("Backup ke Google Drive selesai");
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
      toast.success("Restore dari Drive selesai, memuat ulang...");
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
      toast.success("File backup berhasil diunduh");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengekspor data");
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
        
        // Basic validation
        if (!data.wallets && !data.categories && !data.transactions) {
          throw new Error("Invalid backup file format");
        }
        
        setLocalRestoreData(data);
        setIsLocalRestoreDialogOpen(true);
      } catch (error) {
        console.error(error);
        toast.error("File tidak valid. Pastikan ini adalah file backup MoniKu.");
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
      toast.success("Restore data lokal selesai, memuat ulang...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      toast.error("Gagal restore data");
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
          Cloud Backup (Google Drive)
        </h3>
        
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          {showIOSPWANotice && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
              <strong>Catatan:</strong> Backup Google Drive tidak dapat dilakukan dari PWA di iOS karena keterbatasan teknis Safari. Silakan buka MoniKu di browser Safari biasa (bukan dari Home Screen) untuk menggunakan fitur ini.
            </div>
          )}
          
          {are3rdPartyCookiesBlocked() && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
              <strong>Peringatan:</strong> Cookie pihak ketiga diblokir. Login Google mungkin gagal. Aktifkan di pengaturan browser.
            </div>
          )}
          
          {!hasClientId && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
              <strong>Peringatan:</strong> Google Client ID belum dikonfigurasi. Fitur login Google Drive dinonaktifkan.
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Backup ke akun Google Drive Anda. Klik tombol di bawah untuk memverifikasi sesi Google dan mengunggah backup dengan aman.
          </p>
          
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Terakhir sinkronisasi: {dayjs(lastSyncAt).format("D MMM YYYY, HH:mm")}
            </p>
          )}
          
          {userEmail && (
            <p className="text-xs text-muted-foreground">
              Akun Google: {userEmail}
            </p>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={handleDriveBackup} 
              disabled={isLoading || !hasClientId || showIOSPWANotice} 
              variant="default" 
              className="flex-1"
            >
              Backup ke Drive
            </Button>
            <Button 
              onClick={handleDriveRestoreClick} 
              disabled={isLoading || !hasClientId || showIOSPWANotice} 
              variant="secondary" 
              className="flex-1"
            >
              Restore
            </Button>
          </div>
        </div>
      </div>

      {/* Local File Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icons.HardDrive className="h-5 w-5" />
          Local Backup (File JSON)
        </h3>
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            Download data sebagai file ke perangkat Anda, tanpa perlu terhubung ke internet.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleLocalBackup} disabled={isLoading} variant="outline" className="flex-1 gap-2">
              <Icons.Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isLoading} 
              variant="outline" 
              className="flex-1 gap-2"
            >
              <Icons.Upload className="h-4 w-4" />
              Upload
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
            <DialogTitle>Konfirmasi Restore Cloud</DialogTitle>
            <DialogDescription>
              Data lokal di perangkat ini akan ditimpa SEPENUHNYA dengan data dari Google Drive. Apakah Anda yakin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={executeDriveRestore} disabled={isLoading}>
              Ya, Timpa Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Local File Restore Dialog */}
      <Dialog open={isLocalRestoreDialogOpen} onOpenChange={setIsLocalRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Restore Lokal</DialogTitle>
            <DialogDescription>
              Data saat ini akan ditimpa SEPENUHNYA dengan data dari file JSON. 
              {localRestoreData && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm text-left">
                  <p><strong>Statistik File:</strong></p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>Transaksi: {Array.isArray(localRestoreData.transactions) ? localRestoreData.transactions.length : 0}</li>
                    <li>Dompet: {Array.isArray(localRestoreData.wallets) ? localRestoreData.wallets.length : 0}</li>
                    <li>Kategori: {Array.isArray(localRestoreData.categories) ? localRestoreData.categories.length : 0}</li>
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLocalRestoreDialogOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={executeLocalRestore} disabled={isLoading}>
              Ya, Timpa Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
