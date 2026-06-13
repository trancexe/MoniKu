"use client";

import { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}

export function AnalyticsCard({ title, children, action, className = "", id }: AnalyticsCardProps) {
  return (
    <section id={id} className={`rounded-2xl bg-card p-4 md:p-6 shadow-sm border border-border/50 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AnalyticsEmpty({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-8 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="font-medium text-sm text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">{description}</p>
    </div>
  );
}

export function AnalyticsSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`${height} rounded-2xl bg-muted/40 animate-pulse`} />
  );
}

export function PeriodToggle({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
