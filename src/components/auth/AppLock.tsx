"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { verifyPin } from "@/lib/crypto-utils";
import { verifyBiometric } from "@/lib/webauthn";
import { Fingerprint, Delete, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function AppLock() {
  const { pinHash, pinSalt, isBiometricEnabled, credentialId, unlockSession, failedAttempts, incrementFailedAttempts, lockoutUntil } = useAuthStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setLockoutTimeLeft(Math.ceil((lockoutUntil - Date.now()) / 1000));
      interval = setInterval(() => {
        const left = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (left <= 0) {
          setLockoutTimeLeft(0);
          clearInterval(interval);
        } else {
          setLockoutTimeLeft(left);
        }
      }, 1000);
    } else {
      setLockoutTimeLeft(0);
    }
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleBiometric = useCallback(async () => {
    if (!isBiometricEnabled || !credentialId || lockoutTimeLeft > 0) return;
    const success = await verifyBiometric(credentialId);
    if (success) {
      unlockSession();
    } else {
      toast.error("Biometrik gagal atau dibatalkan");
    }
  }, [isBiometricEnabled, credentialId, unlockSession, lockoutTimeLeft]);

  useEffect(() => {
    // Automatically prompt biometric on load if enabled
    if (isBiometricEnabled && credentialId && lockoutTimeLeft === 0) {
      handleBiometric();
    }
  }, [isBiometricEnabled, credentialId, handleBiometric, lockoutTimeLeft]);

  const handleKeypad = async (num: string) => {
    if (pin.length >= 4 || lockoutTimeLeft > 0) return;
    
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (pinHash && pinSalt) {
        const isValid = await verifyPin(newPin, pinSalt, pinHash);
        if (isValid) {
          unlockSession();
        } else {
          incrementFailedAttempts();
          setError(true);
          setTimeout(() => setPin(""), 500); // clear after short delay
        }
      }
    }
  };

  const handleDelete = () => {
    if (lockoutTimeLeft > 0) return;
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const dots = [0, 1, 2, 3];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center justify-center space-y-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Aplikasi Terkunci</h2>
          <p className="text-muted-foreground text-sm text-center">
            Masukkan PIN 4-digit Anda untuk membuka MoniKu
          </p>
        </div>

        <div className="flex gap-4 mb-8 min-h-[24px] items-center justify-center">
          {lockoutTimeLeft > 0 ? (
            <p className="text-destructive font-medium text-sm animate-pulse">
              Terkunci. Coba lagi dalam {lockoutTimeLeft} detik
            </p>
          ) : (
            dots.map((_, i) => (
              <motion.div
                key={i}
                animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-200",
                  pin.length > i 
                    ? "bg-primary border-primary" 
                    : error ? "border-destructive" : "border-muted"
                )}
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full px-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              className="h-16 text-2xl rounded-2xl bg-card border-none shadow-sm hover:bg-muted"
              onClick={() => handleKeypad(num.toString())}
            >
              {num}
            </Button>
          ))}
          
          <div className="flex items-center justify-center">
            {isBiometricEnabled && credentialId && (
              <Button
                variant="ghost"
                size="lg"
                className="h-16 w-16 rounded-2xl text-primary hover:bg-primary/10"
                onClick={handleBiometric}
              >
                <Fingerprint className="w-8 h-8" />
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-2xl rounded-2xl bg-card border-none shadow-sm hover:bg-muted"
            onClick={() => handleKeypad("0")}
          >
            0
          </Button>
          
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="lg"
              className="h-16 w-16 rounded-2xl text-muted-foreground hover:bg-muted"
              onClick={handleDelete}
              disabled={pin.length === 0}
            >
              <Delete className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
