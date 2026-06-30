"use client";

import Link from "next/link";
import { Ghost, ArrowLeft } from "@phosphor-icons/react";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50">
        <Ghost weight="duotone" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Oops! Page not found</h1>
      <p className="mb-8 max-w-[280px] text-muted-foreground">
        We couldn&apos;t find the page you were looking for. It might have been moved or doesn&apos;t exist.
      </p>
      <Link 
        href="/"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground shadow-sm transition-all ease-spring duration-300 hover:bg-primary/90 active:scale-[0.96]"
      >
        <ArrowLeft weight="bold" className="h-5 w-5" />
        Back to Dashboard
      </Link>
    </div>
  );
}
