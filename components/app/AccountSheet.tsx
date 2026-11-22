"use client";

import { ArrowLeft, Bell, ChevronRight, Search, Settings, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { ACCOUNT_LINKS, Avatar } from "@/components/app/AppNav";
import { ErrorMessage } from "@/components/auth/AuthButtons";
import { AuthField } from "@/components/auth/AuthField";
import { Sheet } from "@/components/home/Sheet";
import { LogOutButton } from "@/components/LogOutButton";
import { deleteAccount } from "@/lib/account";
import { changePassword, updateDisplayName } from "@/lib/auth";
import type { CurrentUser } from "@/lib/session";
import { PRIVACY_PATH } from "@/lib/site";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/validation";

type View = "account" | "name" | "password" | "delete";

const TITLES: Record<View, string> = {
  account: "Profile",
  name: "Name",
  password: "Password",
  delete: "Delete your account?",
};

/** Longest name it takes, the same as the Android app. */
const MAX_NAME_LENGTH = 60;

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const ROW = "flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left";
const BUTTON = `flex h-12 w-full cursor-pointer items-center justify-center rounded-xl text-base font-semibold transition disabled:cursor-default disabled:opacity-40 ${FOCUS}`;
const PRIMARY = `${BUTTON} bg-primary text-white enabled:hover:bg-primary-pressed`;

function Row({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="shrink-0 text-base text-text">{label}</span>
      <span className="flex min-w-0 flex-1 justify-end text-[15px] text-muted">{value}</span>
      {onClick ? (
        <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-subtle" />
      ) : null}
    </>
  );
  if (!onClick) return <div className={ROW}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ROW} cursor-pointer transition-colors hover:bg-field ${FOCUS}`}
    >
      {content}
    </button>
  );
}

function NameForm({ current, onDone }: { current: string; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const busy = saving || refreshing;
  const canSave = trimmed.length > 0 && trimmed !== current;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || busy) return;
    setSaving(true);
    setError(null);
    const problem = await updateDisplayName(trimmed);
    setSaving(false);
    if (problem) {
      setError(problem);
      return;
    }
    // Back to the list once it shows the new name.
    startRefresh(() => {
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <AuthField
        label="Your name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="name"
        autoFocus
      />
      <ErrorMessage message={error} />
      <button type="submit" disabled={!canSave || busy} aria-busy={busy} className={PRIMARY}>
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function PasswordForm({
  withGoogle,
  email,
  onDone,
}: {
  withGoogle: boolean;
  email: string;
  onDone: (notice: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password ? "Passwords don’t match" : null;
  const canSave = password.length >= MIN_PASSWORD_LENGTH && confirm === password;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || busy) return;
    setBusy(true);
    setError(null);
    const problem = await changePassword(password);
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    onDone(
      withGoogle
        ? `Password saved. You can now log in with ${email} and this password, or keep using Continue with Google.`
        : "Password saved. Use your new password the next time you log in.",
    );
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <AuthField
        label="New password"
        secure
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={passwordProblem(password)}
        autoComplete="new-password"
        autoFocus
      />
      <AuthField
        label="Confirm password"
        secure
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={mismatch}
        autoComplete="new-password"
      />
      <ErrorMessage message={error} />
      <button type="submit" disabled={!canSave || busy} aria-busy={busy} className={PRIMARY}>
        {busy ? "Saving…" : "Save password"}
      </button>
      <p className="text-sm leading-5 text-muted">
        {withGoogle
          ? "Set a password to also log in with your email. Continue with Google keeps working."
          : "Choose a new password for logging in with your email."}
      </p>
    </form>
  );
}

function DeleteConfirm({
  busy,
  onBusyChange,
  onCancel,
}: {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    onBusyChange(true);
    setError(null);
    let problem: string | null;
    try {
      problem = await deleteAccount();
    } catch {
      problem = "Couldn’t reach the server. Check your internet connection and try again.";
    }
    if (problem) {
      onBusyChange(false);
      setError(problem);
      return;
    }
    // A full reload, so nothing from this account stays in the browser's hidden pages.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-[22px] text-muted">
        This deletes your account and all your todos, settings and Google Calendar connection, for
        good. It can’t be undone.
      </p>
      <ErrorMessage message={error} />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          autoFocus
          className={`${BUTTON} bg-field text-text enabled:hover:bg-line`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          aria-busy={busy}
          className={`${BUTTON} bg-danger text-on-status enabled:hover:brightness-95`}
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

/** The Android app's Account page, in a modal: name, email, password and deleting the account. */
export function AccountSheet({
  user,
  unreadNotifications,
  onOpenNotifications,
  onOpenSearch,
  onOpenSettings,
  onClose,
}: {
  user: CurrentUser;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("account");
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logOutError, setLogOutError] = useState<string | null>(null);

  const open = (next: View) => {
    setNotice(null);
    setLogOutError(null);
    setView(next);
  };

  return (
    <Sheet
      label={TITLES[view]}
      large
      fixedHeight
      onRequestClose={() => {
        if (!deleting) onClose();
      }}
    >
      <div className="mb-6 flex min-h-9 items-center gap-1 pr-10">
        {view !== "account" ? (
          <button
            type="button"
            onClick={() => setView("account")}
            disabled={deleting}
            aria-label="Back to profile"
            className={`-ml-2 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-ink disabled:cursor-default disabled:opacity-40 ${FOCUS}`}
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
        ) : null}
        <h2 className="text-xl font-bold text-text">{TITLES[view]}</h2>
      </div>

      {view === "account" ? (
        <div>
          {notice ? (
            <p role="status" className="mb-2 rounded-xl bg-canvas p-3 text-sm leading-5 text-success">
              {notice}
            </p>
          ) : null}
          <Row label="Avatar" value={<Avatar user={user} />} />
          <Row
            label="Name"
            value={<span className="truncate">{user.name ?? "Add your name"}</span>}
            onClick={() => open("name")}
          />
          <Row label="Email" value={<span className="truncate">{user.email}</span>} />
          <Row label="Password" onClick={() => open("password")} />

          {/* Phones have no account dropdown, so what's in it is here. */}
          <div className="md:hidden">
            <div aria-hidden="true" className="mx-2 my-3 h-px bg-line" />
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={onOpenSearch}
              className={`${ROW} cursor-pointer transition-colors hover:bg-field ${FOCUS}`}
            >
              <Search aria-hidden="true" className="size-[22px] shrink-0 text-ink" />
              <span className="flex-1 text-base text-text">Search</span>
              <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-subtle" />
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={onOpenNotifications}
              className={`${ROW} cursor-pointer transition-colors hover:bg-field ${FOCUS}`}
            >
              <Bell aria-hidden="true" className="size-[22px] shrink-0 text-ink" />
              <span className="flex-1 text-base text-text">Notifications</span>
              {unreadNotifications > 0 ? (
                <span className="rounded-md bg-primary px-1.5 text-xs leading-5 font-semibold text-white">
                  {unreadNotifications}
                </span>
              ) : null}
              <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-subtle" />
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={onOpenSettings}
              className={`${ROW} cursor-pointer transition-colors hover:bg-field ${FOCUS}`}
            >
              <Settings aria-hidden="true" className="size-[22px] shrink-0 text-ink" />
              <span className="flex-1 text-base text-text">Settings</span>
              <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-subtle" />
            </button>
            <nav aria-label="Account pages">
              {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  // A public page outside the app, so the app stays open in its own tab.
                  {...(href === PRIVACY_PATH ? { target: "_blank", rel: "noopener" } : {})}
                  onClick={onClose}
                  className={`${ROW} transition-colors hover:bg-field ${FOCUS}`}
                >
                  <Icon aria-hidden="true" className="size-[22px] shrink-0 text-ink" />
                  <span className="flex-1 text-base text-text">{label}</span>
                  <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-subtle" />
                </Link>
              ))}
            </nav>
            <LogOutButton
              onError={setLogOutError}
              className={`${ROW} cursor-pointer text-base text-danger transition-colors hover:bg-field disabled:cursor-default disabled:opacity-60 [&>svg]:size-[22px] [&>svg]:shrink-0 ${FOCUS}`}
            />
            <ErrorMessage message={logOutError} />
          </div>

          <div aria-hidden="true" className="mx-2 my-3 h-px bg-line" />
          <button
            type="button"
            onClick={() => open("delete")}
            className={`${ROW} cursor-pointer transition-colors hover:bg-field ${FOCUS}`}
          >
            <TriangleAlert aria-hidden="true" className="size-[22px] shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-base text-danger">Delete account</span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
                Deleting your account is permanent. You’ll immediately lose access to all your data.
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-subtle" />
          </button>
        </div>
      ) : null}

      {view === "name" ? (
        <NameForm current={user.name ?? ""} onDone={() => setView("account")} />
      ) : null}
      {view === "password" ? (
        <PasswordForm
          withGoogle={user.withGoogle}
          email={user.email}
          onDone={(message) => {
            setNotice(message);
            setView("account");
          }}
        />
      ) : null}
      {view === "delete" ? (
        <DeleteConfirm
          busy={deleting}
          onBusyChange={setDeleting}
          onCancel={() => setView("account")}
        />
      ) : null}
    </Sheet>
  );
}
