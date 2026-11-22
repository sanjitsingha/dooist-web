"use client";

import {
  Bell,
  Blocks,
  Bot,
  CalendarSync,
  LoaderCircle,
  Moon,
  Sun,
  SunMoon,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { OverflowMenu } from "@/components/app/OverflowMenu";
import { SwitchTrack } from "@/components/app/SwitchTrack";
import { ErrorMessage } from "@/components/auth/AuthButtons";
import { Sheet } from "@/components/home/Sheet";
import { useCalendarConnection, type CalendarProblem } from "@/hooks/useCalendarConnection";
import {
  useNotificationPermission,
  useNotificationSettings,
  type BrowserPermission,
} from "@/hooks/useNotificationSettings";
import type { NotificationKind } from "@/lib/notifications";
import type { CurrentUser } from "@/lib/session";
import type { Appearance } from "@/lib/theme";

type Section = "appearance" | "notifications" | "calendar" | "integrations";

const SECTIONS: readonly { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "appearance", label: "Appearance", icon: SunMoon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "calendar", label: "Calendar", icon: CalendarSync },
  { id: "integrations", label: "Integrations", icon: Blocks },
];

const LOOKS: readonly { value: Appearance; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: SunMoon },
];

/** The Android wording, except that connecting happens in the Android app for now. */
const PROBLEMS: Record<CalendarProblem, string> = {
  revoked:
    "Dooist’s access to your Google account was removed, so todos stopped going to Google Calendar. Reconnect in the Android app to pick up again.",
  calendar_deleted:
    "The Dooist calendar was deleted in Google Calendar, so todos stopped going there. Reconnect in the Android app to make it again.",
};

export const NOTIFICATION_KINDS: readonly {
  kind: NotificationKind;
  title: string;
  description: string;
}[] = [
  { kind: "reminder", title: "Todo reminders", description: "When a todo’s reminder time comes." },
  { kind: "due", title: "Todos due today", description: "One summary a day, from 8 am." },
  {
    kind: "update",
    title: "Official updates",
    description: "News from Dooist, like a new version.",
  },
];

const PERMISSION_TEXT: Record<BrowserPermission, string> = {
  default: "Allow Dooist to show notifications in this browser while it’s open in a tab.",
  granted: "Notifications show while Dooist is open in a tab, even in the background.",
  denied:
    "Blocked in this browser. To turn them on, click the icon beside the address bar, open Site settings, and set Notifications to Allow.",
  unsupported: "This browser can’t show notifications.",
  phone: "On phones, notifications come from the Dooist Android app.",
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const BUTTON = `flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-default disabled:opacity-40 ${FOCUS}`;
/** The Android app's plain settings row: no box, just what it is and its value or radio. */
const ROW = "flex min-h-[52px] items-center gap-3 px-2";
/** A taller row with a line under its title, as on Android's Calendar page. */
const TEXT_ROW = "flex min-h-16 items-center gap-3 py-2.5";
const ROW_TITLE = "block text-base text-text";
const ROW_DESCRIPTION = "mt-0.5 block text-[13px] leading-[18px] text-muted";

function Pane({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h3 className="mb-2 pr-10 text-xl font-bold text-text">{title}</h3>
      {children}
    </>
  );
}

/** A round radio button, as on Android: an empty ring, or a ring with a dot when picked. */
function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
        selected ? "border-ink" : "border-subtle"
      }`}
    >
      {selected ? <span className="size-2 rounded-full bg-ink" /> : null}
    </span>
  );
}

function AppearancePane({
  appearance,
  onChange,
}: {
  appearance: Appearance;
  onChange: (next: Appearance) => Promise<string | null>;
}) {
  const [error, setError] = useState<string | null>(null);

  const pick = async (next: Appearance) => {
    setError(null);
    setError(await onChange(next));
  };

  return (
    <Pane title="Appearance">
      <fieldset className="-mx-2">
        <legend className="sr-only">Appearance</legend>
        {LOOKS.map(({ value, label, icon: Icon }) => {
          const selected = appearance === value;
          return (
            <label
              key={value}
              className={`${ROW} cursor-pointer rounded-lg transition-colors hover:bg-field has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink`}
            >
              <input
                type="radio"
                name="appearance"
                value={value}
                checked={selected}
                onChange={() => void pick(value)}
                className="sr-only"
              />
              <Icon aria-hidden="true" className="size-5 shrink-0 text-ink" />
              <span className="flex-1 text-base text-text">{label}</span>
              <Radio selected={selected} />
            </label>
          );
        })}
      </fieldset>
      <div className="mt-2">
        <ErrorMessage message={error} />
      </div>
    </Pane>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h4 className="pt-4 pb-1 text-[13px] font-semibold text-muted">{children}</h4>;
}

/** A setting that's on or off: its name and a line about it, with the switch at the right. */
function SwitchRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const descriptionId = useId();
  return (
    <label className={`relative ${TEXT_ROW} ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span className="min-w-0 flex-1">
        <span className={ROW_TITLE}>{title}</span>
        <span id={descriptionId} className={ROW_DESCRIPTION}>
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-label={title}
        aria-describedby={descriptionId}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <SwitchTrack
        checked={checked}
        className="peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
      />
    </label>
  );
}

/** This browser's permission, and which kinds of notification are on. The phone has its own. */
function NotificationsPane({ user }: { user: CurrentUser }) {
  const { settings, setKind } = useNotificationSettings(user.id);
  const { permission, request } = useNotificationPermission();
  const [asking, setAsking] = useState(false);

  const allow = async () => {
    setAsking(true);
    try {
      await request();
    } finally {
      setAsking(false);
    }
  };

  return (
    <Pane title="Notifications">
      <SectionTitle>Browser</SectionTitle>
      <div className={TEXT_ROW}>
        <span className="min-w-0 flex-1">
          <span className={ROW_TITLE}>Browser notifications</span>
          <span className={ROW_DESCRIPTION}>{PERMISSION_TEXT[permission]}</span>
        </span>
        {permission === "default" ? (
          <button
            type="button"
            onClick={() => void allow()}
            disabled={asking}
            aria-busy={asking}
            className={`${BUTTON} shrink-0 bg-primary text-white enabled:hover:bg-primary-pressed`}
          >
            Allow
          </button>
        ) : permission === "granted" ? (
          <span className="shrink-0 text-sm text-muted">Allowed</span>
        ) : permission === "denied" ? (
          <span className="shrink-0 text-sm text-danger">Blocked</span>
        ) : null}
      </div>

      <div aria-hidden="true" className="mt-3 h-px bg-line" />
      <SectionTitle>Notify me about</SectionTitle>
      {NOTIFICATION_KINDS.map(({ kind, title, description }) => (
        <SwitchRow
          key={kind}
          title={title}
          description={description}
          checked={settings[kind]}
          disabled={false}
          onChange={(value) => setKind(kind, value)}
        />
      ))}
    </Pane>
  );
}

type Busy = "resync" | "disconnect" | "events" | "sync" | null;

/** The Android app's Calendar page: Account, Events and Todo sync. */
function CalendarPane({ user, whenSaved }: { user: CurrentUser; whenSaved: () => Promise<void> }) {
  const { connection, failed, retry, resync, disconnect, setTodoSync, setShowEvents } =
    useCalendarConnection(user.id, whenSaved);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connected = connection?.connected === true;

  /** One action at a time, saying what went wrong, if anything. */
  const run = async (
    kind: Exclude<Busy, null>,
    action: () => Promise<string | null>,
    failureTitle: string,
  ) => {
    if (busy) return null;
    setBusy(kind);
    setNotice(null);
    setError(null);
    const failure = await action();
    setBusy(null);
    if (failure) setError(`${failureTitle}. ${failure}`);
    return failure;
  };

  const startResync = async () => {
    const failure = await run("resync", resync, "Couldn’t resync Google Calendar");
    if (failure === null) setNotice("Your todos were sent to Google Calendar again.");
  };

  const confirmDisconnect = async () => {
    setConfirming(false);
    await run("disconnect", disconnect, "Couldn’t disconnect Google Calendar");
  };

  let account: ReactNode;
  if (connection?.connected) {
    account = (
      <div className={TEXT_ROW}>
        <span className="min-w-0 flex-1">
          <span className={`${ROW_TITLE} truncate`}>{connection.email ?? "Google account"}</span>
          <span className={ROW_DESCRIPTION}>Google Calendar</span>
        </span>
        {busy === "resync" || busy === "disconnect" ? (
          <span role="status" aria-label="Working" className="flex size-9 items-center justify-center">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-muted" />
          </span>
        ) : (
          <OverflowMenu
            label="Google account options"
            actions={[
              { label: "Resync", onSelect: () => void startResync() },
              {
                label: "Disconnect",
                destructive: true,
                onSelect: () => {
                  setError(null);
                  setNotice(null);
                  setConfirming(true);
                },
              },
            ]}
          />
        )}
      </div>
    );
  } else if (failed) {
    account = (
      <div className={TEXT_ROW}>
        <span className="min-w-0 flex-1 text-sm leading-5 text-muted">
          Couldn’t load your calendar connection.
        </span>
        <button
          type="button"
          onClick={retry}
          className={`${BUTTON} shrink-0 bg-field text-text enabled:hover:bg-line`}
        >
          Try again
        </button>
      </div>
    );
  } else if (!connection) {
    account = (
      <div role="status" className={`${TEXT_ROW} text-sm text-muted`}>
        Loading…
      </div>
    );
  } else {
    account = (
      <p className="py-2.5 text-sm leading-5 text-muted">
        {connection.problem
          ? PROBLEMS[connection.problem]
          : "Connect your Google account in the Dooist Android app to send your todos to Google Calendar, and to see your events in Dooist."}
      </p>
    );
  }

  return (
    <Pane title="Calendar">
      {notice ? (
        <p role="status" className="mt-2 rounded-xl bg-canvas p-3 text-sm leading-5 text-success">
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className="mt-2">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      <SectionTitle>Account</SectionTitle>
      {account}

      <div aria-hidden="true" className="mt-3 h-px bg-line" />
      <SectionTitle>Events</SectionTitle>
      <SwitchRow
        title="Show calendar events in Dooist"
        description="Events from your Google Calendar show in Today, next to your todos. Dooist only reads them."
        checked={connected && connection.showEvents}
        disabled={!connected || busy !== null}
        onChange={(value) => void run("events", () => setShowEvents(value), "Couldn’t change Events")}
      />

      <div aria-hidden="true" className="mt-3 h-px bg-line" />
      <SectionTitle>Todo sync</SectionTitle>
      <SwitchRow
        title="Sync todos to Google Calendar"
        description="Your todos go to a calendar named Dooist. Off, new changes stay in Dooist, and what’s already in Google Calendar stays."
        checked={connected && connection.syncTodos}
        disabled={!connected || busy !== null}
        onChange={(value) => void run("sync", () => setTodoSync(value), "Couldn’t change Todo sync")}
      />

      {confirming ? (
        <Sheet label="Disconnect Google Calendar?" small onRequestClose={() => setConfirming(false)}>
          <h2 className="mb-2 pr-10 text-xl font-bold text-text">Disconnect Google Calendar?</h2>
          <p className="mb-5 text-[15px] leading-[22px] text-muted">
            Dooist stops sending todos to {connection?.email ?? "Google"} and stops showing your
            events. The Dooist calendar and its events stay in Google Calendar. You can connect
            again from the Android app.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              autoFocus
              className={`${BUTTON} bg-field text-text enabled:hover:bg-line`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDisconnect()}
              className={`${BUTTON} bg-danger text-on-status enabled:hover:brightness-95`}
            >
              Disconnect
            </button>
          </div>
        </Sheet>
      ) : null}
    </Pane>
  );
}

function IntegrationsPane() {
  return (
    <Pane title="Integrations">
      <div className={`-mx-2 ${ROW}`}>
        <Bot aria-hidden="true" className="size-[22px] shrink-0 text-ink" />
        <span className="min-w-0 flex-1 text-base text-text">Connect ChatGPT</span>
        <span className="shrink-0 text-sm text-muted">Coming soon</span>
      </div>
    </Pane>
  );
}

/** Settings in a modal: its own side nav on the left (tabs on phones), the section on the right. */
export function SettingsSheet({
  user,
  appearance,
  onAppearanceChange,
  whenSaved,
  onClose,
}: {
  user: CurrentUser;
  appearance: Appearance;
  onAppearanceChange: (next: Appearance) => Promise<string | null>;
  /** Resolves once this browser's todo changes have reached the account. */
  whenSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>("appearance");

  return (
    <Sheet label="Settings" wide onRequestClose={onClose}>
      <div className="flex h-full min-h-0 flex-col md:flex-row">
        <div className="shrink-0 border-b border-line bg-canvas pt-5 md:w-60 md:border-r md:border-b-0 md:p-4 md:pt-6">
          <h2 className="mb-3 px-5 text-xl font-bold text-text md:mb-4 md:px-2.5">Settings</h2>
          <nav
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:flex-col md:overflow-visible md:p-0"
          >
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setSection(id)}
                  className={`flex h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
                    active
                      ? "bg-field font-semibold text-ink"
                      : "font-medium text-muted hover:bg-field hover:text-text"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`size-4 shrink-0 ${active ? "text-primary" : ""}`}
                  />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <section
          aria-label={SECTIONS.find(({ id }) => id === section)?.label}
          className="min-h-0 flex-1 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:p-8"
        >
          {section === "appearance" ? (
            <AppearancePane appearance={appearance} onChange={onAppearanceChange} />
          ) : null}
          {section === "notifications" ? <NotificationsPane user={user} /> : null}
          {section === "calendar" ? <CalendarPane user={user} whenSaved={whenSaved} /> : null}
          {section === "integrations" ? <IntegrationsPane /> : null}
        </section>
      </div>
    </Sheet>
  );
}
