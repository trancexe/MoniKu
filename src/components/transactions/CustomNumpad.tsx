"use client";

import { Delete } from "lucide-react";

interface CustomNumpadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CustomNumpad({ value, onChange, onSubmit }: CustomNumpadProps) {
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

  return (
    <div className="grid w-full grid-cols-3 gap-2 pb-safe-bottom">
      {keys.flat().map((key, idx) => {
        if (key === "del") {
          return (
            <button
              key={idx}
              type="button"
              onClick={handleDelete}
              className="flex h-14 items-center justify-center rounded-xl bg-secondary/50 text-xl font-medium transition-all hover:bg-secondary/70 active:scale-[0.98] active:bg-secondary"
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
            className="flex h-14 items-center justify-center rounded-xl bg-secondary/50 text-2xl font-semibold transition-all hover:bg-secondary/70 active:scale-[0.98] active:bg-secondary"
          >
            {key}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSubmit}
        className="col-span-3 mt-2 flex h-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
      >
        Simpan Transaksi
      </button>
    </div>
  );
}
