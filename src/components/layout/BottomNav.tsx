"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, PieChart, Settings } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Transaksi", href: "/transactions", icon: PlusCircle },
    { name: "Analitik", href: "/analytics", icon: PieChart },
    { name: "Setting", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background px-4 pb-safe-bottom md:left-1/2 md:-translate-x-1/2 md:max-w-md">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center space-y-1 p-2 ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
