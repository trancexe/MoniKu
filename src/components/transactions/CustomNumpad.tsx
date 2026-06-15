"use client";

import { Delete } from "lucide-react";
import { useT } from "@/lib/i18n";

interface CustomNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /**
   * Disables the submit button. Number keys remain active so the user
   * can correct a typo while a submit is in flight, but the submit
   * action is blocked at both the click and the parent guard. Use to
   * prevent double-submit on slow Dexie transactions.
   */
  disabled?: boolean;
  submitLabel?: string;
  /** Function to compute aria-label for a digit key (e.g. "1", "2", or "1" / "one" for i18n) */
  ariaLabelNumber?: (n: string) => string;
  /** aria-label for the delete button */
  ariaLabelDelete?: string;
}

export function CustomNumpad({ value, onChange, onSubmit, disabled = false, submitLabel = "Simpan Transaksi", ariaLabelNumber, ariaLabelDelete }: CustomNumpadProps) {
  const t = useT();
  const handlePress = (key: string) => {
    if (value === "0" && key !== "0") {
      onChange(key);
    } else {
      // Prevent extremely large numbers for UI limits
      if (value.length < 12) {
        onChange(value + key);
      }
    }
  };

  const handleDelete = () => {
    if (value.length > 1) {
      onChange(value.slice(0, -1));
    } else {
      onChange("0");
    }
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["000", "0", "del"],
  ];

  const labelFor = (key: string) => ariaLabelNumber ? ariaLabelNumber(key) : key;

  return (
    <div
      role="group"
      aria-label={t("numpad.groupLabel")}
      className="grid w-full grid-cols-3 gap-2 pb-safe-bottom"
    >
      {keys.flat().map((key, idx) => {
        if (key === "del") {
          return (
            <button
              key={idx}
              type="button"
              onClick={handleDelete}
              aria-label={ariaLabelDelete || "Delete"}
              className="flex h-12 sm:h-14 items-center justify-center rounded-xl bg-secondary/50 text-xl font-medium transition-all hover:bg-secondary/70 active:scale-[0.98] active:bg-secondary"
            >
              <Delete className="h-6 w-6" />
            </button>
          );
        }
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handlePress(key)}
            aria-label={labelFor(key)}
            className="flex h-12 sm:h-14 items-center justify-center rounded-xl bg-secondary/50 text-2xl font-semibold transition-all hover:bg-secondary/70 active:scale-[0.98] active:bg-secondary"
          >
            {key}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        aria-busy={disabled}
        className="col-span-3 mt-2 flex h-12 sm:h-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {submitLabel}
      </button>
    </div>
  );
}
