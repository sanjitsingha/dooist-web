"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { ACCOUNT_LINKS, Avatar } from "@/components/app/AppNav";
import { useApp } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { LogOutButton } from "@/components/LogOutButton";

/** Who's signed in, and logging out. Phones get the account dropdown's links here as rows. */
export function ProfileScreen() {
  const { user, showError } = useApp();

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 md:px-8">
      <PageHeader title="Profile" />

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-canvas p-4">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-text">{user.name ?? user.email}</p>
          {user.name ? <p className="truncate text-sm text-muted">{user.email}</p> : null}
        </div>
      </div>

      <nav aria-label="Account pages" className="mt-3 md:hidden">
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center gap-3 rounded-xl px-2 text-base text-text transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          >
            <Icon aria-hidden="true" className="size-[22px] shrink-0 text-ink" />
            <span className="flex-1">{label}</span>
            <ChevronRight aria-hidden="true" className="size-[18px] text-subtle" />
          </Link>
        ))}
      </nav>

      <LogOutButton
        onError={showError}
        className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white text-base font-semibold text-danger transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-60"
      />
    </div>
  );
}
