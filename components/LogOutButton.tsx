"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { logOut } from "@/lib/auth";

export function LogOutButton({
  className,
  onError,
  iconOnly = false,
}: {
  className: string;
  onError: (message: string) => void;
  /** Just the icon, for tight spots like the foot of the side nav. */
  iconOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const label = busy ? "Logging out…" : "Log out";

  const leave = async () => {
    setBusy(true);
    const problem = await logOut();
    if (problem) {
      setBusy(false);
      onError(problem);
      return;
    }
    // A full reload, so nothing from this account stays in the browser's hidden pages. This is
    // what the Next.js guide recommends for logging out (guides/preserving-ui-state).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return (
    <button
      type="button"
      onClick={leave}
      disabled={busy}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={className}
    >
      <LogOut aria-hidden="true" className="size-5" />
      {iconOnly ? null : <span>{label}</span>}
    </button>
  );
}
