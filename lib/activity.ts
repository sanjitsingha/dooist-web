import type { TodoRow } from "@/lib/database.types";
import { addDays, fromDateKey, toDateKey, type DateKey } from "@/lib/dates";

export type ActivityRow = Pick<
  TodoRow,
  "id" | "title" | "created_at" | "updated_at" | "completed" | "completed_at" | "deleted_at"
>;

export type ActivityKind = "added" | "updated" | "completed" | "deleted";
/** Marking a todo not done leaves no trace in the account, so it has no activity to show. */
export type ReportType = ActivityKind | "uncompleted";
/** Any date, a range, or an exact day. */
export type DateChoice = "any" | "today" | "week" | "month" | DateKey;

export type ActivityEvent = {
  id: string;
  todoId: string;
  kind: ActivityKind;
  title: string;
  at: number;
};

/** A save this close to adding, completing or deleting is part of that, not a separate edit. */
const SAME_CHANGE_MS = 60_000;

/**
 * The history the `todos` table can tell: when each todo was added, completed and deleted, and
 * its latest edit. Earlier edits aren't kept anywhere. Newest first.
 */
export function buildActivity(rows: readonly ActivityRow[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const row of rows) {
    const push = (kind: ActivityKind, at: number) =>
      events.push({ id: `${row.id}:${kind}`, todoId: row.id, kind, title: row.title, at });

    const created = Date.parse(row.created_at);
    const known = [created];
    push("added", created);
    if (row.completed && row.completed_at) {
      const completed = Date.parse(row.completed_at);
      known.push(completed);
      push("completed", completed);
    }
    if (row.deleted_at) {
      const deleted = Date.parse(row.deleted_at);
      known.push(deleted);
      push("deleted", deleted);
    }
    const updated = Date.parse(row.updated_at);
    if (known.every((at) => Math.abs(updated - at) > SAME_CHANGE_MS)) push("updated", updated);
  }
  return events.sort((a, b) => b.at - a.at);
}

/** "This week" runs Sunday to Saturday, like the calendar. */
export function matchesDate(at: number, choice: DateChoice, today: DateKey): boolean {
  const day = toDateKey(new Date(at));
  if (choice === "any") return true;
  if (choice === "today") return day === today;
  if (choice === "month") return day.slice(0, 7) === today.slice(0, 7);
  if (choice === "week") {
    const now = fromDateKey(today);
    const sunday = addDays(now, -now.getDay());
    return day >= toDateKey(sunday) && day <= toDateKey(addDays(sunday, 6));
  }
  return day === choice;
}

/** Events in order, under the day each happened. */
export function groupByDay(events: readonly ActivityEvent[]) {
  const days = new Map<DateKey, ActivityEvent[]>();
  for (const event of events) {
    const day = toDateKey(new Date(event.at));
    const list = days.get(day);
    if (list) list.push(event);
    else days.set(day, [event]);
  }
  return [...days].map(([day, items]) => ({ day, items }));
}
