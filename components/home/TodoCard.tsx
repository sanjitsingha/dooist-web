"use client";

import { Calendar, Check } from "lucide-react";

import {
  formatDueDateTime,
  getDueDateKind,
  isOverdue,
  type DueDateKind,
} from "@/lib/dates";
import { priorityOf, type Todo } from "@/lib/todos";

const CHIPS: Record<DueDateKind, string> = {
  today: "bg-accent-soft text-accent-dark",
  tomorrow: "bg-sun-soft text-sun-dark",
  weekend: "bg-sky-soft text-sky-dark",
  nextWeek: "bg-ink-soft text-ink",
};

export function dueLabel(todo: Todo, now: Date): string {
  const label = formatDueDateTime(todo.dueDate, todo.dueTime, now);
  return !todo.completed && isOverdue(todo.dueDate, now) ? `Overdue · ${label}` : label;
}

/** The due date: a colored chip when it's soon, plain gray further out, red when overdue. */
function DueDateChip({ todo, now }: { todo: Todo; now: Date }) {
  const overdue = !todo.completed && isOverdue(todo.dueDate, now);
  const kind = todo.completed ? null : getDueDateKind(todo.dueDate, now);
  const look = overdue
    ? "gap-1 text-danger"
    : kind
      ? `gap-[3px] rounded-full px-1.5 py-px ${CHIPS[kind]}`
      : "gap-1 text-muted";

  return (
    <span className={`inline-flex items-center text-[11px] font-medium ${look}`}>
      <Calendar aria-hidden="true" className="size-2.5" />
      {dueLabel(todo, now)}
    </span>
  );
}

/** One todo: a checkbox, its title and due date, on a card tinted by priority. */
export function TodoCard({
  todo,
  now,
  onOpen,
  onToggle,
}: {
  todo: Todo;
  now: Date;
  onOpen: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
}) {
  const priority = priorityOf(todo.priority);

  return (
    <div
      className={`relative mb-2 flex items-start gap-2 rounded-2xl p-2 ${
        todo.completed ? "bg-canvas" : priority.card
      }`}
    >
      {/* The whole card opens the details. It sits underneath, so the checkbox keeps its click. */}
      <button
        type="button"
        onClick={() => onOpen(todo)}
        aria-label={`${todo.title}, ${dueLabel(todo, now)}, ${priority.label} priority${
          todo.completed ? ", done" : ""
        }. Open details`}
        className="absolute inset-0 cursor-pointer rounded-2xl transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
      />

      <button
        type="button"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={`Mark ${todo.title} as ${todo.completed ? "not done" : "done"}`}
        onClick={() => onToggle(todo)}
        className={`relative m-[3px] flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] transition-colors before:absolute before:-inset-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          todo.completed
            ? "border-primary bg-primary text-ink"
            : "border-subtle bg-white hover:border-primary"
        }`}
      >
        {todo.completed ? <Check aria-hidden="true" strokeWidth={3} className="size-[13px]" /> : null}
      </button>

      <div aria-hidden="true" className="pointer-events-none relative min-w-0 flex-1">
        <p
          className={`line-clamp-2 text-base leading-6 font-semibold wrap-break-word ${
            todo.completed ? "text-subtle line-through" : priority.title
          }`}
        >
          {todo.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <DueDateChip todo={todo} now={now} />
        </div>
      </div>
    </div>
  );
}
