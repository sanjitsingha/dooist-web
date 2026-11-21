"use client";

import {
  ChartPie,
  Check,
  ChevronDown,
  CirclePlus,
  Info,
  LayoutList,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ToggleEvent } from "react";

import { LogOutButton } from "@/components/LogOutButton";
import { useSidebar } from "@/hooks/useSidebar";
import type { CurrentUser } from "@/lib/session";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const MENU_ITEM =
  "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

/** The same destinations as the Android app's tabs. */
const PAGES = [
  { href: "/", label: "Today", icon: LayoutList },
  { href: "/stats", label: "Stats", icon: ChartPie },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

/** The pages in the account dropdown. */
const MENU_LINKS = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/changelog", label: "Changelog", icon: ScrollText },
] as const;

/** Phones have no dropdown, so the Profile page lists these. */
export const ACCOUNT_LINKS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/changelog", label: "Changelog", icon: ScrollText },
  { href: "/about", label: "About", icon: Info },
  { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
] as const;

/** The person's profile picture, or the first letter of their name if they don't have one. */
export function Avatar({ user, small = false }: { user: CurrentUser; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from((user.name ?? user.email).trim())[0]?.toUpperCase() ?? "?";
  const pixels = small ? 28 : 36;
  const box = small ? "size-7" : "size-9";

  if (user.avatarUrl && !failed) {
    return (
      <Image
        src={user.avatarUrl}
        alt=""
        width={pixels}
        height={pixels}
        unoptimized
        // Google refuses some profile pictures when told which site is asking.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${box} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-dark ${
        small ? "text-xs" : "text-sm"
      }`}
    >
      {initial}
    </span>
  );
}

type NavProps = {
  onAdd: () => void;
};

type AccountActions = {
  version: string;
  onSync: () => Promise<boolean>;
  onError: (message: string) => void;
};

/** Fetches the latest from the account, and says how it went. The dropdown stays open. */
function SyncItem({ onSync, onError }: Pick<AccountActions, "onSync" | "onError">) {
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const run = async () => {
    if (state === "syncing") return;
    clearTimeout(resetTimer.current);
    setState("syncing");
    const synced = await onSync();
    if (!synced) {
      setState("idle");
      onError("Couldn’t sync. Check your connection and try again.");
      return;
    }
    setState("done");
    resetTimer.current = setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button
      type="button"
      onClick={run}
      aria-busy={state === "syncing"}
      className={`${MENU_ITEM} font-medium text-text`}
    >
      {state === "done" ? (
        <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
      ) : (
        <RefreshCw
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted ${state === "syncing" ? "animate-spin" : ""}`}
        />
      )}
      <span aria-live="polite">
        {state === "syncing" ? "Syncing…" : state === "done" ? "Synced" : "Sync"}
      </span>
    </button>
  );
}

/**
 * The picture and name, opening the account dropdown. It's a browser popover, so it isn't cut off
 * by the narrow collapsed nav, and clicking away or pressing Escape closes it.
 */
function AccountMenu({
  user,
  collapsed,
  version,
  onSync,
  onError,
}: AccountActions & { user: CurrentUser; collapsed: boolean }) {
  const pathname = usePathname();
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const displayName = user.name ?? user.email;

  useEffect(() => {
    if (!open) return;
    const close = () => menu.current?.hidePopover();
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  const placeMenu = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState !== "open" || !trigger.current) return;
    const { left, bottom } = trigger.current.getBoundingClientRect();
    event.currentTarget.style.left = `${left}px`;
    event.currentTarget.style.top = `${bottom + 4}px`;
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        aria-label={`${displayName}, account menu`}
        aria-expanded={open}
        aria-controls={menuId}
        title={collapsed ? displayName : undefined}
        className={`flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-2 text-left transition-colors hover:bg-field rail:w-full rail:flex-none rail:justify-center rail:px-0 ${
          open ? "bg-field" : ""
        } ${FOCUS}`}
      >
        <Avatar user={user} small />
        <span className="min-w-0 truncate text-[13px] font-semibold text-text rail:sr-only">
          {displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`ml-0.5 size-3.5 shrink-0 text-muted transition-transform rail:hidden ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        ref={menu}
        id={menuId}
        popover="auto"
        onBeforeToggle={placeMenu}
        onToggle={(event) => setOpen(event.newState === "open")}
        className="fixed inset-auto m-0 max-h-[calc(100dvh-64px)] w-56 overflow-y-auto rounded-xl border border-line bg-white p-1.5 text-text shadow-lg"
      >
        <nav aria-label="Account" className="flex flex-col gap-0.5">
          {MENU_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => menu.current?.hidePopover()}
                className={`${MENU_ITEM} ${
                  active ? "bg-field font-semibold text-ink" : "font-medium text-text"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted"}`}
                />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-0.5">
          <SyncItem onSync={onSync} onError={onError} />
        </div>

        <div aria-hidden="true" className="my-1 h-px bg-line" />
        <LogOutButton
          onError={onError}
          className={`${MENU_ITEM} font-medium text-danger disabled:cursor-default disabled:opacity-60 [&>svg]:size-4 [&>svg]:shrink-0`}
        />

        <div aria-hidden="true" className="my-1 h-px bg-line" />
        <p className="px-2.5 py-1 text-xs text-muted">Version {version}</p>
      </div>
    </>
  );
}

/**
 * Desktop: stays in place on every page, with the account at the top. It collapses to a rail of
 * icons; the `rail:` styles do that, so it's right before React has even loaded. Labels stay
 * there for screen readers.
 */
export function Sidebar({
  user,
  onAdd,
  version,
  onSync,
  onError,
}: NavProps & AccountActions & { user: CurrentUser }) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const toggleLabel = collapsed ? "Open side menu" : "Collapse side menu";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-line p-4 transition-[width,padding] duration-200 ease-out motion-reduce:transition-none md:flex rail:w-[72px] rail:px-3">
      <div className="mb-5 flex shrink-0 items-center gap-1 rail:flex-col">
        <AccountMenu
          user={user}
          collapsed={collapsed}
          version={version}
          onSync={onSync}
          onError={onError}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          title={toggleLabel}
          className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-ink ${FOCUS}`}
        >
          <PanelLeftClose aria-hidden="true" className="size-5 rail:hidden" />
          <PanelLeftOpen aria-hidden="true" className="hidden size-5 rail:block" />
        </button>
      </div>

      <button
        type="button"
        onClick={onAdd}
        title={collapsed ? "Add todo" : undefined}
        className={`group flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-[15px] font-semibold text-ink transition-colors hover:bg-field rail:justify-center rail:px-0 ${FOCUS}`}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary transition-colors group-hover:bg-primary-pressed">
          <Plus aria-hidden="true" strokeWidth={2.5} className="size-4" />
        </span>
        <span className="whitespace-nowrap rail:sr-only">Add todo</span>
      </button>

      <nav aria-label="Main" className="mt-5 flex flex-col gap-1">
        {PAGES.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={`flex h-10 items-center gap-2.5 rounded-xl px-3 text-[15px] transition-colors rail:justify-center rail:px-0 ${FOCUS} ${
                active
                  ? "bg-field font-semibold text-ink"
                  : "font-medium text-muted hover:bg-field hover:text-ink"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-5 shrink-0 ${active ? "text-primary" : ""}`}
              />
              <span className="whitespace-nowrap rail:sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const TAB = `flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 text-xs leading-[14px] ${FOCUS}`;

/** Phones: the same bottom bar as the Android app. Logging out is on the Profile page. */
export function BottomNav({ onAdd }: NavProps) {
  const pathname = usePathname();

  const tab = ({ href, label, icon: Icon }: (typeof PAGES)[number]) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`${TAB} ${active ? "font-semibold text-ink" : "font-medium text-subtle"}`}
      >
        <Icon aria-hidden="true" className={`size-[22px] ${active ? "text-primary" : ""}`} />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex h-[72px] items-center">
        {tab(PAGES[0])}
        <button type="button" onClick={onAdd} className={`${TAB} font-medium text-subtle`}>
          <CirclePlus aria-hidden="true" className="size-[22px]" />
          Add Todo
        </button>
        {tab(PAGES[1])}
        {tab(PAGES[2])}
      </div>
    </nav>
  );
}
