"use client";

import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { uploadBackup, downloadBackup } from "@/lib/gdrive";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export function SyncSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setToken(codeResponse.access_token),
    onError: (error) => console.log('Login Failed:', error),
    scope: "https://www.googleapis.com/auth/drive.appdata"
  });

  const handleBackup = async () => {
    if (!token) return toast.error("Silahkan login Google Drive terlebih dahulu");
    setIsLoading(true);
    try {
      await uploadBackup(token);
      toast.success("Backup selesai");
    } catch (error) {
      toast.error("Gagal backup data");
    } finally {
      setIsLoading(false);
    }
  };

  const executeRestore = async () => {
    setIsRestoreDialogOpen(false);
    setIsLoading(true);
    try {
      await downloadBackup(token!);
      toast.success("Restore selesai, memuat ulang...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error("Gagal restore data (mungkin file tidak ditemukan)");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreClick = () => {
    if (!token) return toast.error("Silahkan login Google Drive terlebih dahulu");
    setIsRestoreDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Cloud Backup (Google Drive)</h3>
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        {!token ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Login untuk backup/restore data.</p>
            <Button onClick={() => login()} className="w-full">
              Login dengan Google
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-green-600 font-medium">✓ Terhubung dengan Google Drive</p>
            <div className="flex gap-2">
              <Button onClick={handleBackup} disabled={isLoading} variant="default" className="flex-1">
                Backup
              </Button>
              <Button onClick={handleRestoreClick} disabled={isLoading} variant="outline" className="flex-1">
                Restore
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Restore</DialogTitle>
            <DialogDescription>
              Data lokal saat ini akan ditimpa dengan data dari Google Drive. Apakah Anda yakin ingin melanjutkan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button variant="default" onClick={executeRestore} disabled={isLoading}>
              Ya, Restore Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
