"use client";

import {
  Bell,
  Blocks,
  CalendarSync,
  Check,
  ChevronDown,
  LoaderCircle,
  MessageSquareText,
  Moon,
  RotateCcw,
  Settings2,
  Sun,
  SunMoon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type ToggleEvent } from "react";

import { OverflowMenu } from "@/components/app/OverflowMenu";
import { SwitchTrack } from "@/components/app/SwitchTrack";
import { ErrorMessage } from "@/components/auth/AuthButtons";
import { Sheet } from "@/components/home/Sheet";
import { Pagination } from "@/components/reporting/Pagination";
import { useCalendarConnection, type CalendarProblem } from "@/hooks/useCalendarConnection";
import { useHideCompleted } from "@/hooks/useHideCompleted";
import {
  useNotificationPermission,
  useNotificationSettings,
  type BrowserPermission,
} from "@/hooks/useNotificationSettings";
import { useNow } from "@/hooks/useNow";
import { RECENTLY_DELETED_DAYS, useRecentlyDeleted } from "@/hooks/useRecentlyDeleted";
import type { FeedbackSubject } from "@/lib/database.types";
import { formatDayPhrase, formatDueDateTime, fromDateKey, toDateKey } from "@/lib/dates";
import { FEEDBACK_SUBJECTS, MAX_FEEDBACK_LENGTH, sendFeedback } from "@/lib/feedback";
import type { NotificationKind } from "@/lib/notifications";
import type { CurrentUser } from "@/lib/session";
import type { Appearance } from "@/lib/theme";
import type { Todo } from "@/lib/todos";

type Section =
  | "general"
  | "appearance"
  | "notifications"
  | "calendar"
  | "integrations"
  | "feedback";

const SECTIONS: readonly { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "appearance", label: "Appearance", icon: SunMoon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "calendar", label: "Calendar", icon: CalendarSync },
  { id: "integrations", label: "Integrations", icon: Blocks },
  { id: "feedback", label: "Feedback", icon: MessageSquareText },
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

const DAY = 24 * 60 * 60 * 1000;
/** Only a few deleted todos at a time, so the list stays short inside Settings. */
const DELETED_PAGE_SIZE = 5;

/** "Deleted today", "Deleted yesterday" or "Deleted 3 days ago", by calendar day. */
function deletedAgo(at: number, now: Date): string {
  const days = Math.round(
    (fromDateKey(toDateKey(now)).getTime() - fromDateKey(toDateKey(new Date(at))).getTime()) / DAY,
  );
  if (days <= 0) return "Deleted today";
  if (days === 1) return "Deleted yesterday";
  return `Deleted ${days} days ago`;
}

/** Todos deleted lately, the latest first, each with a button that brings it back. */
function RecentlyDeleted({
  user,
  whenSaved,
  onRestoreTodo,
}: {
  user: CurrentUser;
  whenSaved: () => Promise<void>;
  onRestoreTodo: (todo: Todo) => void;
}) {
  const { todos, status, retry, restore } = useRecentlyDeleted(user.id, whenSaved, onRestoreTodo);
  const now = useNow();
  const [requestedPage, setRequestedPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  // Restoring can shorten the list, so fall back to the last page that still exists.
  const page = Math.max(1, Math.min(requestedPage, Math.ceil(todos.length / DELETED_PAGE_SIZE)));
  const shown = todos.slice((page - 1) * DELETED_PAGE_SIZE, page * DELETED_PAGE_SIZE);

  const bringBack = (todo: Todo) => {
    restore(todo);
    setNotice(`“${todo.title}” is back, due ${formatDayPhrase(todo.dueDate, now)}.`);
  };

  let list: ReactNode;
  if (status === "loading") {
    list = (
      <div role="status" className={`${TEXT_ROW} text-sm text-muted`}>
        Loading…
      </div>
    );
  } else if (status === "error") {
    list = (
      <div className={TEXT_ROW}>
        <span className="min-w-0 flex-1 text-sm leading-5 text-muted">
          Couldn’t load your deleted todos.
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
  } else if (todos.length === 0) {
    list = (
      <p className="py-2.5 text-sm leading-5 text-muted">
        Nothing deleted in the last {RECENTLY_DELETED_DAYS} days.
      </p>
    );
  } else {
    list = (
      <>
        <ul>
          {shown.map(({ todo, deletedAt }) => (
            <li key={todo.id} className={`${TEXT_ROW} border-b border-line last:border-b-0`}>
              <span className="min-w-0 flex-1">
                <span className={`${ROW_TITLE} truncate`}>{todo.title}</span>
                <span className={ROW_DESCRIPTION}>
                  {[
                    `Due ${formatDueDateTime(todo.dueDate, todo.dueTime, now)}`,
                    ...(todo.completed ? ["Done"] : []),
                    deletedAgo(deletedAt, now),
                  ].join(" · ")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => bringBack(todo)}
                aria-label={`Restore ${todo.title}`}
                className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm text-text transition-colors hover:text-primary ${FOCUS}`}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Restore
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={DELETED_PAGE_SIZE}
            total={todos.length}
            label="Recently deleted pages"
            onChange={setRequestedPage}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SectionTitle>Recently deleted</SectionTitle>
      <p className="text-[13px] leading-[18px] text-muted">
        Todos you deleted in the last {RECENTLY_DELETED_DAYS} days. Restore puts one back on its due
        date, just as it was.
      </p>
      {notice ? (
        <p role="status" className="mt-3 rounded-xl bg-canvas p-3 text-sm leading-5 text-success">
          {notice}
        </p>
      ) : null}
      {list}
    </>
  );
}

/** Settings for how todos show, and Recently deleted. */
function GeneralPane({
  user,
  whenSaved,
  onRestoreTodo,
}: {
  user: CurrentUser;
  whenSaved: () => Promise<void>;
  onRestoreTodo: (todo: Todo) => void;
}) {
  const { hideCompleted, setHideCompleted } = useHideCompleted();
  return (
    <Pane title="General">
      <SectionTitle>Todos</SectionTitle>
      <SwitchRow
        title="Hide completed todos"
        description="Todos you’ve marked as done don’t show on Today, in this browser. Search and Reporting still show them."
        checked={hideCompleted}
        disabled={false}
        onChange={setHideCompleted}
      />

      <div aria-hidden="true" className="mt-3 h-px bg-line" />
      <RecentlyDeleted user={user} whenSaved={whenSaved} onRestoreTodo={onRestoreTodo} />
    </Pane>
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

/** OpenAI's mark, from Simple Icons (CC0). In the text color, so it's black or white with the theme. */
function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function IntegrationsPane() {
  return (
    <Pane title="Integrations">
      <div className={`-mx-2 ${ROW}`}>
        <ChatGPTIcon className="size-[22px] shrink-0 text-text" />
        <span className="min-w-0 flex-1 text-base text-text">ChatGPT</span>
        <span className="shrink-0 text-sm text-muted">Coming soon</span>
      </div>
    </Pane>
  );
}

const SUBJECT_ITEM_HEIGHT = 44;
/** The subject menu's padding and border, top and bottom together. */
const SUBJECT_MENU_CHROME = 14;
const MENU_GAP = 4;
const SCREEN_MARGIN = 16;

/**
 * The Subject field: the chosen subject on an underline, as in the Android app, opening a menu of
 * the subjects as wide as the field (above it when there isn't room below). A browser popover, like
 * the ⋮ menu, so the modal's edges don't cut it off.
 */
function SubjectPicker({
  value,
  onChange,
}: {
  value: FeedbackSubject | null;
  onChange: (next: FeedbackSubject) => void;
}) {
  const menuId = useId();
  const labelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const chosen = FEEDBACK_SUBJECTS.find((subject) => subject.value === value);

  // Placed once on opening, so moving the page away from it closes it.
  useEffect(() => {
    if (!open) return;
    const close = () => menu.current?.hidePopover();
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const place = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState !== "open" || !trigger.current) return;
    const box = trigger.current.getBoundingClientRect();
    const height = FEEDBACK_SUBJECTS.length * SUBJECT_ITEM_HEIGHT + SUBJECT_MENU_CHROME;
    const opensUp =
      box.bottom + MENU_GAP + height > window.innerHeight - SCREEN_MARGIN &&
      box.top - MENU_GAP - height >= SCREEN_MARGIN;
    const { style } = event.currentTarget;
    style.width = `${box.width}px`;
    style.left = `${box.left}px`;
    style.top = `${opensUp ? box.top - MENU_GAP - height : box.bottom + MENU_GAP}px`;
  };

  const ChosenIcon = chosen?.icon;

  return (
    <div>
      <span id={labelId} className="mb-1 block text-sm font-semibold text-text">
        Subject
      </span>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        aria-label={`Subject: ${chosen?.label ?? "Choose a subject"}`}
        aria-expanded={open}
        aria-controls={menuId}
        className={`flex h-12 w-full cursor-pointer items-center gap-2.5 border-b-[1.5px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          open ? "border-primary" : "border-line hover:border-subtle"
        }`}
      >
        {ChosenIcon ? <ChosenIcon aria-hidden="true" className="size-5 shrink-0 text-ink" /> : null}
        <span className={`min-w-0 flex-1 truncate text-base ${chosen ? "text-text" : "text-subtle"}`}>
          {chosen?.label ?? "Choose a subject"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-[18px] shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        ref={menu}
        id={menuId}
        popover="auto"
        role="listbox"
        aria-labelledby={labelId}
        onBeforeToggle={place}
        onToggle={(event) => setOpen(event.newState === "open")}
        className="fixed inset-auto m-0 rounded-xl border border-line bg-surface py-1.5 text-text shadow-lg"
      >
        {FEEDBACK_SUBJECTS.map(({ value: subject, label, icon: Icon }) => {
          const selected = subject === value;
          return (
            <button
              key={subject}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                menu.current?.hidePopover();
                onChange(subject);
                trigger.current?.focus();
              }}
              className="flex h-11 w-full cursor-pointer items-center gap-3 px-4 text-left text-[15px] text-text transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0 text-ink" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {selected ? <Check aria-hidden="true" className="size-[18px] shrink-0 text-ink" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The Android app's Feedback page: a Subject, a message, and Send feedback. It's saved to the
 * same `feedback` table as the app's, marked as from the web.
 */
function FeedbackPane({ version }: { version: string }) {
  const messageId = useId();
  const [subject, setSubject] = useState<FeedbackSubject | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSend = subject !== null && message.trim().length > 0;

  const send = async () => {
    if (!subject || !canSend || busy) return;
    setBusy(true);
    setError(null);
    setSent(false);
    const problem = await sendFeedback(subject, message, version);
    setBusy(false);
    // What they wrote stays put, so they can try again.
    if (problem) {
      setError(problem);
      return;
    }
    setSubject(null);
    setMessage("");
    setSent(true);
  };

  return (
    <Pane title="Feedback">
      {sent ? (
        <p role="status" className="mt-2 rounded-xl bg-canvas p-3 text-sm leading-5 text-success">
          Thanks for your feedback. It helps make Dooist better.
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="mt-4 flex flex-col gap-5"
      >
        <SubjectPicker
          value={subject}
          onChange={(next) => {
            setSubject(next);
            setSent(false);
          }}
        />

        <div>
          <label htmlFor={messageId} className="mb-2 block text-sm font-semibold text-text">
            Message
          </label>
          {/* As in the Android app: white, outlined in gray, Dooist orange while typing. */}
          <textarea
            id={messageId}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setSent(false);
            }}
            placeholder="Write your feedback"
            maxLength={MAX_FEEDBACK_LENGTH}
            rows={6}
            className="block min-h-40 w-full resize-y rounded-xl border-[1.5px] border-line bg-surface p-3.5 text-base leading-[22px] text-text outline-none transition-colors placeholder:text-subtle focus:border-primary"
          />
          {/* Only once it's getting close to the limit. */}
          {message.length > MAX_FEEDBACK_LENGTH * 0.8 ? (
            <p className="mt-1.5 text-right text-[13px] text-muted">
              {message.length} / {MAX_FEEDBACK_LENGTH}
            </p>
          ) : null}
        </div>

        <ErrorMessage message={error} />
        <button
          type="submit"
          disabled={!canSend || busy}
          aria-busy={busy}
          className={`${BUTTON} h-12 w-full bg-primary text-base text-white enabled:hover:bg-primary-pressed`}
        >
          {busy ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          ) : (
            "Send feedback"
          )}
        </button>

        <p className="text-sm leading-5 text-muted">
          Tell us what’s working, what isn’t, or what you’d like to see next.
        </p>
      </form>
    </Pane>
  );
}

/** Settings in a modal: its own side nav on the left (tabs on phones), the section on the right. */
export function SettingsSheet({
  user,
  appearance,
  onAppearanceChange,
  whenSaved,
  onRestoreTodo,
  version,
  onClose,
}: {
  user: CurrentUser;
  appearance: Appearance;
  onAppearanceChange: (next: Appearance) => Promise<string | null>;
  /** Resolves once this browser's todo changes have reached the account. */
  whenSaved: () => Promise<void>;
  /** Brings back a deleted todo, from Recently deleted. */
  onRestoreTodo: (todo: Todo) => void;
  /** The web app's version, sent with feedback. */
  version: string;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>("general");

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
          {section === "general" ? (
            <GeneralPane user={user} whenSaved={whenSaved} onRestoreTodo={onRestoreTodo} />
          ) : null}
          {section === "appearance" ? (
            <AppearancePane appearance={appearance} onChange={onAppearanceChange} />
          ) : null}
          {section === "notifications" ? <NotificationsPane user={user} /> : null}
          {section === "calendar" ? <CalendarPane user={user} whenSaved={whenSaved} /> : null}
          {section === "integrations" ? <IntegrationsPane /> : null}
          {section === "feedback" ? <FeedbackPane version={version} /> : null}
        </section>
      </div>
    </Sheet>
  );
}
