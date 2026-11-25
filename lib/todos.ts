import type { Priority, TodoInsert, TodoRow } from "@/lib/database.types";
import {
  MINUTES_PER_DAY,
  fromDayMinutes,
  toDayMinutes,
  type DateKey,
  type TimeKey,
} from "@/lib/dates";

export type { Priority };

export type Todo = {
  id: string;
  title: string;
  description?: string;
  dueDate: DateKey;
  dueTime?: TimeKey;
  reminderTime?: TimeKey;
  /** How long it takes, in minutes. */
  duration?: number;
  priority: Priority;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
};

export type NewTodo = Pick<
  Todo,
  "title" | "description" | "dueDate" | "dueTime" | "reminderTime" | "duration" | "priority"
>;

/** What can be changed on a saved todo. A key set to undefined clears that value. */
export type TodoChanges = Partial<NewTodo>;

export const PRIORITIES: readonly {
  value: Priority;
  label: string;
  /** The open card's background and title. */
  card: string;
  title: string;
  /** The picked pill in a sheet. */
  pill: string;
}[] = [
  {
    value: "high",
    label: "High",
    card: "bg-danger-soft",
    title: "text-danger-deep",
    pill: "bg-danger-soft font-semibold text-danger",
  },
  {
    value: "medium",
    label: "Medium",
    card: "bg-amber-soft",
    title: "text-amber-deep",
    pill: "bg-amber-soft font-semibold text-amber-dark",
  },
  {
    value: "low",
    label: "Low",
    card: "bg-sky-soft",
    title: "text-sky-deep",
    pill: "bg-sky-soft font-semibold text-sky-dark",
  },
];

export function priorityOf(priority: Priority) {
  return PRIORITIES.find((level) => level.value === priority) ?? PRIORITIES[1];
}

/** Same id format as the Android app. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fromRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date,
    dueTime: row.due_time ?? undefined,
    reminderTime: row.reminder_time ?? undefined,
    duration: row.duration ?? undefined,
    priority: row.priority,
    completed: row.completed,
    completedAt: row.completed_at ? Date.parse(row.completed_at) : undefined,
    createdAt: Date.parse(row.created_at),
  };
}

export function toRow(todo: Todo, userId: string): TodoInsert {
  return {
    id: todo.id,
    user_id: userId,
    title: todo.title,
    description: todo.description ?? null,
    due_date: todo.dueDate,
    due_time: todo.dueTime ?? null,
    reminder_time: todo.reminderTime ?? null,
    duration: todo.duration ?? null,
    priority: todo.priority,
    completed: todo.completed,
    completed_at: todo.completedAt ? new Date(todo.completedAt).toISOString() : null,
    created_at: new Date(todo.createdAt).toISOString(),
    deleted_at: null,
  };
}

/** Only the columns that changed, so an edit here never overwrites anything else from the phone. */
export function toPatch(changes: TodoChanges): Partial<TodoInsert> {
  const patch: Partial<TodoInsert> = {};
  if ("title" in changes && changes.title) patch.title = changes.title;
  if ("description" in changes) patch.description = changes.description ?? null;
  if ("dueDate" in changes && changes.dueDate) patch.due_date = changes.dueDate;
  if ("dueTime" in changes) patch.due_time = changes.dueTime ?? null;
  if ("reminderTime" in changes) patch.reminder_time = changes.reminderTime ?? null;
  if ("duration" in changes) patch.duration = changes.duration ?? null;
  if ("priority" in changes && changes.priority) patch.priority = changes.priority;
  return patch;
}

/**
 * A new due time, with the reminder moved by as much, so it still comes as long before. A
 * reminder that would land on another day is left where it was.
 */
export function changeTime(todo: Todo, time: TimeKey): TodoChanges {
  const changes: TodoChanges = { dueTime: time };
  if (todo.dueTime && todo.reminderTime) {
    const reminder =
      toDayMinutes(todo.reminderTime) + toDayMinutes(time) - toDayMinutes(todo.dueTime);
    if (reminder >= 0 && reminder < MINUTES_PER_DAY) {
      changes.reminderTime = fromDayMinutes(reminder);
    }
  }
  return changes;
}

// Comes after every "HH:mm" in a plain string comparison, so todos without a time go last.
const UNTIMED = "~";

/** Todos with a time first, earliest first; the rest in the order they were added. */
export function compareTodos(a: Todo, b: Todo): number {
  const timeA = a.dueTime ?? UNTIMED;
  const timeB = b.dueTime ?? UNTIMED;
  if (timeA !== timeB) return timeA < timeB ? -1 : 1;
  return a.createdAt - b.createdAt;
}
