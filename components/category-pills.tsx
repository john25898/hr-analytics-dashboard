"use client";

import React from "react";
import { CATEGORIES } from "@/lib/hr-options";
import { cn } from "@/lib/utils";

// HRH first because it is the default scope everywhere in the app.
const CATEGORY_ORDER = ["HRH", "CHAK", "CBSL"].filter((c) =>
  CATEGORIES.includes(c),
);

interface CategoryPillsProps {
  value: string;
  onChange: (category: string) => void;
  label?: string;
  className?: string;
}

/**
 * "View data by category" segmented control — the same HRH / CHAK / CBSL
 * switch used on the dashboard, reused by Contracts and Compliance so the
 * three pages behave identically.
 */
export function CategoryPills({
  value,
  onChange,
  label = "View data by category:",
  className,
}: CategoryPillsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
      >
        {CATEGORY_ORDER.map((cat) => {
          const active = value === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                active
                  ? "bg-blue-600 font-medium text-white shadow-sm"
                  : "text-foreground/70 hover:bg-background/60 hover:text-foreground",
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
