"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, PieChart, Settings } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BottomNav() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const t = useT();

  const navItems = [
    { name: t("nav.home"), href: "/", icon: Home },
    { name: t("nav.transactions"), href: "/transactions", icon: PlusCircle },
    { name: t("nav.analytics"), href: "/analytics", icon: PieChart },
    { name: t("nav.settings"), href: "/settings", icon: Settings },
  ];

  return (
    <div className={`fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <nav className="pointer-events-auto relative flex h-16 w-full max-w-[320px] overflow-hidden items-center justify-around rounded-full border border-black/5 bg-white/80 px-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/80">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
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
