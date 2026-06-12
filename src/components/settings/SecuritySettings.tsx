"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { hashPin, verifyPin, generateSalt } from "@/lib/crypto-utils";
import { registerBiometric } from "@/lib/webauthn";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

export function SecuritySettings() {
  const t = useT();
  const { isAppLocked, pinHash, pinSalt, isBiometricEnabled, setAppLocked, setPinData, setBiometricEnabled } = useAuthStore();

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
        toast.success(t("security.appLockEnabled"));
      }
    } else {
      setStep("remove");
      setIsPinDialogOpen(true);
    }
  };

  const handlePinSubmit = async () => {
    if (step === "enter") {
      if (pinInput.length !== 4) return toast.error(t("security.pinRequired"));
      setStep("confirm");
    } else if (step === "confirm") {
      if (pinInput !== confirmPinInput) {
        toast.error(t("security.pinMismatch"));
        setConfirmPinInput("");
        setStep("enter");
        return;
      }
      const newSalt = generateSalt();
      const hash = await hashPin(pinInput, newSalt);
      setPinData(hash, newSalt);
      setAppLocked(true);
      setIsPinDialogOpen(false);
      setPinInput("");
      setConfirmPinInput("");
      toast.success(t("security.pinSuccess"));
    } else if (step === "remove") {
      if (!pinHash || !pinSalt) return;
      const isValid = await verifyPin(pinInput, pinSalt, pinHash);
      if (isValid) {
        setAppLocked(false);
        setBiometricEnabled(false);
        setPinData(null, null);
        setIsPinDialogOpen(false);
        setPinInput("");
        toast.success(t("security.pinRemoveSuccess"));
      } else {
        toast.error(t("security.pinWrong"));
      }
    }
  };

  const handleToggleBiometric = async (checked: boolean) => {
    if (!isAppLocked || !pinHash) {
      toast.error(t("security.biometricEnablePinFirst"));
      return;
    }

    if (checked) {
      const credId = await registerBiometric();
      if (credId) {
        setBiometricEnabled(true, credId);
        toast.success(t("security.biometricRegistered"));
      } else {
        toast.error(t("security.biometricRegisterFailed"));
      }
    } else {
      setBiometricEnabled(false);
      toast.success(t("security.biometricDisabled"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> {t("security.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("security.desc")}</p>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-base">{t("security.pinTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("security.pinDesc")}</p>
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
                <Fingerprint className="w-4 h-4" /> {t("security.biometricTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">{t("security.biometricDesc")}</p>
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
              {step === "enter" && t("security.pinCreateTitle")}
              {step === "confirm" && t("security.pinConfirmTitle")}
              {step === "remove" && t("security.pinRemoveTitle")}
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
            <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>{t("security.pinCancel")}</Button>
            <Button onClick={handlePinSubmit}>{t("security.pinNext")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
