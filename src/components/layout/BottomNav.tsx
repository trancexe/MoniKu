"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, PlusCircle, ChartPieSlice, GearSix } from "@phosphor-icons/react";

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { name: "Home", href: "/", icon: House },
    { name: "Transaksi", href: "/transactions", icon: PlusCircle },
    { name: "Analitik", href: "/analytics", icon: ChartPieSlice },
    { name: "Setting", href: "/settings", icon: GearSix },
  ];

  if (!mounted) {
    return null; // Prevent Next.js Router action dispatched before initialization error
  }

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto relative flex h-16 w-full max-w-[320px] overflow-hidden items-center justify-around rounded-full border border-black/5 bg-white/80 px-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/80">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex h-12 w-12 flex-col items-center justify-center rounded-full transition-all active:scale-95 ${
                isActive 
                  ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-50" 
                  : "text-zinc-400 hover:text-zinc-200 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2 : 1.5} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
