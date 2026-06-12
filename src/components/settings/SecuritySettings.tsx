"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { hashPin, verifyPin } from "@/lib/crypto-utils";
import { registerBiometric } from "@/lib/webauthn";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function SecuritySettings() {
  const { isAppLocked, pinHash, isBiometricEnabled, setAppLocked, setPinHash, setBiometricEnabled } = useAuthStore();
  
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [step, setStep] = useState<"enter" | "confirm" | "remove">("enter");

  const handleToggleAppLock = (checked: boolean) => {
    if (checked) {
      if (!pinHash) {
        setStep("enter");
        setIsPinDialogOpen(true);
      } else {
        setAppLocked(true);
        toast.success("App Lock diaktifkan");
      }
    } else {
      setStep("remove");
      setIsPinDialogOpen(true);
    }
  };

  const handlePinSubmit = async () => {
    if (step === "enter") {
      if (pinInput.length !== 4) return toast.error("PIN harus 4 digit");
      setStep("confirm");
    } else if (step === "confirm") {
      if (pinInput !== confirmPinInput) {
        toast.error("PIN tidak cocok");
        setConfirmPinInput("");
        setStep("enter");
        return;
      }
      const hash = await hashPin(pinInput);
      setPinHash(hash);
      setAppLocked(true);
      setIsPinDialogOpen(false);
      setPinInput("");
      setConfirmPinInput("");
      toast.success("PIN berhasil diatur dan App Lock aktif");
    } else if (step === "remove") {
      if (!pinHash) return;
      const isValid = await verifyPin(pinInput, pinHash);
      if (isValid) {
        setAppLocked(false);
        setBiometricEnabled(false);
        setPinHash(null);
        setIsPinDialogOpen(false);
        setPinInput("");
        toast.success("App Lock dinonaktifkan");
      } else {
        toast.error("PIN salah");
      }
    }
  };

  const handleToggleBiometric = async (checked: boolean) => {
    if (!isAppLocked || !pinHash) {
      toast.error("Aktifkan PIN terlebih dahulu");
      return;
    }

    if (checked) {
      const credId = await registerBiometric();
      if (credId) {
        setBiometricEnabled(true, credId);
        toast.success("Biometrik berhasil didaftarkan");
      } else {
        toast.error("Gagal mendaftarkan biometrik");
      }
    } else {
      setBiometricEnabled(false);
      toast.success("Biometrik dinonaktifkan");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Keamanan
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Lindungi data Anda dengan PIN atau Biometrik</p>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-base">Kunci Aplikasi (PIN)</h3>
            <p className="text-xs text-muted-foreground">Minta PIN 4-digit saat membuka aplikasi</p>
          </div>
          <Switch 
            checked={isAppLocked}
            onCheckedChange={handleToggleAppLock}
          />
        </div>

        {isAppLocked && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> Buka dengan Biometrik
              </h3>
              <p className="text-xs text-muted-foreground">Gunakan sidik jari atau FaceID</p>
            </div>
            <Switch 
              checked={isBiometricEnabled}
              onCheckedChange={handleToggleBiometric}
            />
          </div>
        )}
      </div>

      <Dialog open={isPinDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPinDialogOpen(false);
          setPinInput("");
          setConfirmPinInput("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {step === "enter" && "Buat PIN Baru"}
              {step === "confirm" && "Konfirmasi PIN"}
              {step === "remove" && "Masukkan PIN Anda"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              className="text-center text-2xl tracking-[1em] h-14"
              value={step === "confirm" ? confirmPinInput : pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (step === "confirm") setConfirmPinInput(val);
                else setPinInput(val);
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>Batal</Button>
            <Button onClick={handlePinSubmit}>Lanjut</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
