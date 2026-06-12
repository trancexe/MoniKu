"use client";

import { useState, useRef, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { uploadBackup, downloadBackup, getUserEmail } from "@/lib/gdrive";
import { exportAllData, importAllData, downloadJsonFile } from "@/lib/sync-utils";
import { useSyncStore } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import dayjs from "dayjs";

export function SyncSettings() {
  const { googleToken, userEmail, lastSyncAt, setGoogleToken, setUserEmail, setLastSyncAt, disconnect } = useSyncStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isLocalRestoreDialogOpen, setIsLocalRestoreDialogOpen] = useState(false);
  const [localRestoreData, setLocalRestoreData] = useState<Record<string, unknown> | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize/refresh user email when token changes
  useEffect(() => {
    if (googleToken && !userEmail) {
      getUserEmail(googleToken).then(email => {
        if (email) setUserEmail(email);
      });
    }
  }, [googleToken, userEmail, setUserEmail]);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setGoogleToken(codeResponse.access_token);
      getUserEmail(codeResponse.access_token).then(email => {
        if (email) setUserEmail(email);
      });
      toast.success("Berhasil terhubung ke Google Drive");
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      toast.error("Gagal terhubung ke Google Drive");
    },
    scope: "https://www.googleapis.com/auth/drive.appdata"
  });

  // --- GOOGLE DRIVE HANDLERS ---
  const handleDriveBackup = async () => {
    if (!googleToken) return toast.error("Silahkan login Google Drive terlebih dahulu");
    setIsLoading(true);
    try {
      await uploadBackup(googleToken);
      setLastSyncAt(Date.now());
      toast.success("Backup ke Google Drive selesai");
    } catch (error) {
      console.error(error);
      toast.error("Gagal backup ke Google Drive. Coba relogin.");
    } finally {
      setIsLoading(false);
    }
  };

  const executeDriveRestore = async () => {
    setIsRestoreDialogOpen(false);
    setIsLoading(true);
    try {
      await downloadBackup(googleToken!);
      setLastSyncAt(Date.now());
      toast.success("Restore dari Drive selesai, memuat ulang...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      toast.error("Gagal restore data (mungkin file tidak ditemukan)");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriveRestoreClick = () => {
    if (!googleToken) return toast.error("Silahkan login Google Drive terlebih dahulu");
    setIsRestoreDialogOpen(true);
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
          {!googleToken ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Backup otomatis dan aman ke akun Google Drive Anda. (100% Gratis)
              </p>
              <Button onClick={() => login()} className="w-full" variant="outline">
                Hubungkan ke Google Drive
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium dark:text-green-500 flex items-center gap-1">
                    <Icons.CheckCircle2 className="h-4 w-4" /> 
                    Terhubung
                  </p>
                  {userEmail && <p className="text-xs text-muted-foreground mt-1">{userEmail}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={disconnect} className="h-8 text-xs text-destructive hover:text-destructive">
                  Putus
                </Button>
              </div>

              {lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Terakhir sinkronisasi: {dayjs(lastSyncAt).format('D MMM YYYY, HH:mm')}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleDriveBackup} disabled={isLoading} variant="default" className="flex-1">
                  Backup ke Drive
                </Button>
                <Button onClick={handleDriveRestoreClick} disabled={isLoading} variant="secondary" className="flex-1">
                  Restore
                </Button>
              </div>
            </div>
          )}
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
