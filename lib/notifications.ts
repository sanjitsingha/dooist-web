import { formatDayPhrase, formatTime, fromDateKey, toDateKey, toDayMinutes } from "@/lib/dates";
import type { Todo } from "@/lib/todos";

/** The kinds someone can turn on or off in Settings. */
export type NotificationKind = "reminder" | "due" | "update";

export type AppNotification = {
  /** Stays the same for the same news, so it stays read. A moved reminder gets a new one. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** When it came, in milliseconds. */
  at: number;
  /** About the whole day, so it shows no time of its own. */
  allDay?: boolean;
};

/** A new version of the web app, and when this browser first saw it. */
export type AppUpdate = { version: string; at: number };

/** Reminders older than this drop off the list. */
const KEEP_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;
/** A browser pop-up this late is old news, so it stays in the bell's list only. */
const POP_UP_WINDOW = 10 * 60 * 1000;
/** The day's summary waits for this hour, so it doesn't pop up at midnight. */
const DUE_SUMMARY_HOUR = 8;

/** "Pay rent, Gym and Call the bank.", or "Pay rent, Gym, Call the bank and 2 more." */
function listOf(titles: readonly string[]): string {
  const shown = titles.slice(0, 3);
  const rest = titles.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} and ${rest} more.`;
  if (shown.length === 1) return `${shown[0]}.`;
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}.`;
}

/** What's worth knowing: reminders that have gone off, today's todos, and a new version. */
export function buildNotifications(
  todos: readonly Todo[],
  now: Date,
  update: AppUpdate | null = null,
): AppNotification[] {
  const open = todos.filter((todo) => !todo.completed);
  const today = toDateKey(now);
  const list: AppNotification[] = [];

  for (const todo of open) {
    if (!todo.reminderTime) continue;
    const minutes = toDayMinutes(todo.reminderTime);
    const at = fromDateKey(todo.dueDate);
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (at > now || now.getTime() - at.getTime() > KEEP_DAYS * DAY) continue;
    const time = todo.dueTime ? ` at ${formatTime(todo.dueTime)}` : "";
    list.push({
      id: `reminder:${todo.id}:${todo.dueDate}:${todo.reminderTime}`,
      kind: "reminder",
      title: `Reminder: ${todo.title}`,
      body: `Due ${formatDayPhrase(todo.dueDate, now)}${time}.`,
      at: at.getTime(),
    });
  }

  const dueToday = open.filter((todo) => todo.dueDate === today);
  if (dueToday.length > 0) {
    list.push({
      id: `due:${today}`,
      kind: "due",
      title: `${dueToday.length} ${dueToday.length === 1 ? "todo" : "todos"} due today`,
      body: listOf(dueToday.map((todo) => todo.title)),
      at: fromDateKey(today).getTime(),
      allDay: true,
    });
  }

  if (update && now.getTime() - update.at <= KEEP_DAYS * DAY) {
    list.push({
      id: `update:${update.version}`,
      kind: "update",
      title: "Dooist has been updated",
      body: `You’re now on version ${update.version}.`,
      at: update.at,
    });
  }

  return list.sort((a, b) => b.at - a.at);
}

/** Whether it's the right moment for a browser pop-up about this one. */
export function isTimeForPopUp(notification: AppNotification, now: Date): boolean {
  if (notification.kind === "due") return now.getHours() >= DUE_SUMMARY_HOUR;
  return now.getTime() - notification.at <= POP_UP_WINDOW;
}
