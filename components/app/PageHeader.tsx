import type { ReactNode } from "react";

/** A page's big title, the same size and place as the month on Today, with room for a control. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-2 pt-9 pb-4">
      <h1 className="min-w-0 truncate text-[28px] leading-9 font-semibold tracking-[-0.8px] text-text">
        {title}
      </h1>
      {children}
    </header>
  );
}
