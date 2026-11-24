"use client";

import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  Flag,
  Hourglass,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { OverflowMenu } from "@/components/app/OverflowMenu";
import { DatePickerSheet } from "@/components/home/DatePickerSheet";
import { Sheet } from "@/components/home/Sheet";
import { TimeSelector } from "@/components/home/TimeSelector";
import { useNow } from "@/hooks/useNow";
import {
  MINUTES_PER_DAY,
  earliestReminderMinute,
  formatDueDateTime,
  formatDuration,
  formatLongDate,
  formatTime,
  fromDateKey,
  type DateKey,
  type TimeKey,
} from "@/lib/dates";
import {
  PRIORITIES,
  type NewTodo,
  type Priority,
  type Todo,
  type TodoChanges,
} from "@/lib/todos";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const CONTROL =
  "h-9 rounded-lg border-[1.5px] border-transparent bg-field px-2.5 text-sm font-medium text-text outline-none transition-colors focus:border-primary focus:bg-surface";
/** A date or time value that opens its picker modal. */
const PICKER_BUTTON = `${CONTROL} inline-flex cursor-pointer items-center gap-1.5 hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink`;
/** The name and description read as plain text, with no box or outline, like the Android app. */
const TEXT_FIELD = "block w-full resize-none bg-transparent outline-none field-sizing-content";
const MAIN_BUTTON =
  "mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:opacity-40";

const cleanTitle = (text: string) => text.replace(/\s*\n\s*/g, " ").trim();

/** What's wrong with the picked date and reminder, the same rules as the Android sheets. */
function scheduleProblem(
  date: DateKey,
  reminder: string,
  today: DateKey,
  checks: { date: boolean; reminder: boolean },
): string | null {
  if (!date) return "Pick a due date.";
  if (checks.date && date < today) return "Pick today or a later day.";
  if (checks.reminder && reminder) {
    const [hours, minutes] = reminder.split(":").map(Number);
    const at = fromDateKey(date);
    at.setHours(hours, minutes, 0, 0);
    if (at.getTime() <= Date.now()) return "Pick a reminder time that’s still ahead.";
  }
  return null;
}

function Row({
  icon: Icon,
  iconClass = "text-ink",
  label,
  htmlFor,
  children,
}: {
  icon: LucideIcon;
  iconClass?: string;
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="flex items-center gap-2.5 text-base text-text">
        <Icon aria-hidden="true" className={`size-5 ${iconClass}`} />
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-1">{children}</div>
    </div>
  );
}

/** The time control under a reminder. Times already passed on its day can't be picked. */
function ReminderTime({
  value,
  reminderDate,
  onChange,
}: {
  value: string;
  reminderDate: DateKey;
  onChange: (value: string) => void;
}) {
  const now = useNow();
  const earliest = earliestReminderMinute(reminderDate, now);
  if (earliest >= MINUTES_PER_DAY) {
    return (
      <p className="px-2 pb-2 text-sm leading-5 text-muted">
        This day is over. Pick a later due date to set a reminder.
      </p>
    );
  }
  return <TimeSelector value={value} earliest={earliest} onChange={onChange} />;
}

/** A reminder that opens its time control right under it, with a clear button once it's set. */
function TimeRow({
  icon,
  label,
  value,
  reminderDate,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /** The day the reminder is on. */
  reminderDate: DateKey;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Row icon={icon} label={label} htmlFor={id}>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <button
          id={id}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${label}: ${value ? formatTime(value) : "not set"}`}
          onClick={() => setOpen((current) => !current)}
          className={PICKER_BUTTON}
        >
          <span className={value ? "" : "text-muted"}>{value ? formatTime(value) : "Add"}</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Row>
      <div id={panelId} className="-mx-2">
        {open ? (
          <ReminderTime value={value} reminderDate={reminderDate} onChange={onChange} />
        ) : null}
      </div>
    </div>
  );
}

/** The due date and optional time, which open the date modal. */
function DateRow({
  value,
  time,
  today,
  onChange,
}: {
  value: DateKey;
  time: string;
  today: DateKey;
  onChange: (date: DateKey, time: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <Row icon={Calendar} label="Due date" htmlFor={id}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-label={`Due date: ${formatLongDate(value)}${time ? `, ${formatTime(time)}` : ""}`}
        onClick={() => setOpen(true)}
        className={PICKER_BUTTON}
      >
        {formatDueDateTime(value, time || undefined, fromDateKey(today))}
        <ChevronDown aria-hidden="true" className="size-3.5 text-muted" />
      </button>
      {open ? (
        <DatePickerSheet
          value={value}
          time={time}
          today={today}
          onSave={(date, nextTime) => {
            onChange(date, nextTime);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Row>
  );
}

/** How long a todo takes. A length set on the phone stays, even if it isn't one of these. */
function DurationRow({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const current = Number(value);
  const options =
    value && !DURATIONS.includes(current)
      ? [...DURATIONS, current].sort((a, b) => a - b)
      : DURATIONS;
  return (
    <Row icon={Hourglass} label="Duration" htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${CONTROL} cursor-pointer`}
      >
        <option value="">None</option>
        {options.map((minutes) => (
          <option key={minutes} value={minutes}>
            {formatDuration(minutes)}
          </option>
        ))}
      </select>
    </Row>
  );
}

function PriorityField({ value, onChange }: { value: Priority; onChange: (value: Priority) => void }) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Priority"
      className="flex min-h-[52px] items-center justify-between gap-2"
    >
      <span aria-hidden="true" className="flex items-center gap-2.5 text-base text-text">
        <Flag className="size-5 text-ink" />
        Priority
      </span>
      <div className="flex gap-1">
        {PRIORITIES.map((priority) => {
          const checked = priority.value === value;
          return (
            <label
              key={priority.value}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors max-[340px]:px-1.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink ${
                checked ? priority.pill : "font-medium text-muted hover:bg-field"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={priority.value}
                checked={checked}
                onChange={() => onChange(priority.value)}
                className="sr-only"
              />
              {priority.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ProblemLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm leading-5 text-danger">
      {message}
    </p>
  );
}

export function AddTodoSheet({
  today,
  startDate,
  startTime,
  onAdd,
  onClose,
}: {
  today: DateKey;
  startDate: DateKey;
  /** A time to start with, like one clicked on the timeline. */
  startTime?: TimeKey;
  onAdd: (todo: NewTodo) => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(startDate < today ? today : startDate);
  const [dueTime, setDueTime] = useState(startTime ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [duration, setDuration] = useState("");
  const [reminder, setReminder] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => titleRef.current?.focus(), []);

  const canAdd = cleanTitle(title).length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    const wrong = scheduleProblem(dueDate, reminder, today, { date: true, reminder: true });
    if (wrong) {
      setProblem(wrong);
      return;
    }
    onAdd({
      title: cleanTitle(title),
      description: description.trim() || undefined,
      dueDate,
      dueTime: dueTime || undefined,
      reminderTime: reminder || undefined,
      duration: duration ? Number(duration) : undefined,
      priority,
    });
  };

  const titleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      descriptionRef.current?.focus();
    }
  };

  return (
    <Sheet label="Add todo" medium onRequestClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="pr-8">
          <textarea
            ref={titleRef}
            rows={1}
            value={title}
            maxLength={120}
            aria-label="Todo name"
            placeholder="Todo name"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={titleKeyDown}
            className={`${TEXT_FIELD} py-1 text-[22px] leading-7 font-bold placeholder:text-muted`}
          />
        </div>
        <textarea
          ref={descriptionRef}
          rows={1}
          value={description}
          maxLength={500}
          aria-label="Description, optional"
          placeholder="Description"
          onChange={(event) => setDescription(event.target.value)}
          className={`${TEXT_FIELD} mt-1 max-h-40 py-1 text-base leading-[22px] placeholder:text-muted`}
        />

        <div className="mt-1">
          <DateRow
            value={dueDate}
            time={dueTime}
            today={today}
            onChange={(date, time) => {
              setDueDate(date);
              setDueTime(time);
              setProblem(null);
            }}
          />
          <PriorityField value={priority} onChange={setPriority} />
          <DurationRow value={duration} onChange={setDuration} />
          <TimeRow
            icon={Bell}
            label="Reminder"
            value={reminder}
            reminderDate={dueDate}
            onChange={(value) => {
              setReminder(value);
              setProblem(null);
            }}
          />
        </div>

        <ProblemLine message={problem} />
        <button
          type="submit"
          disabled={!canAdd}
          className={`${MAIN_BUTTON} bg-primary text-white enabled:hover:bg-primary-pressed`}
        >
          Add todo
        </button>
      </form>
    </Sheet>
  );
}

/**
 * A todo's details. Like the Android sheet there's no edit mode: change anything, and it's saved
 * when the sheet closes.
 */
export function TodoDetailsSheet({
  todo,
  today,
  onSave,
  onToggle,
  onDelete,
  onClose,
}: {
  todo: Todo;
  today: DateKey;
  onSave: (changes: TodoChanges) => void;
  onToggle: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  // Compared against the todo as it was on opening, so a phone change that arrives meanwhile
  // isn't undone by fields nobody touched here.
  const [opened] = useState(todo);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [dueDate, setDueDate] = useState(todo.dueDate);
  const [dueTime, setDueTime] = useState(todo.dueTime ?? "");
  const [priority, setPriority] = useState(todo.priority);
  const [duration, setDuration] = useState(todo.duration ? String(todo.duration) : "");
  const [reminder, setReminder] = useState(todo.reminderTime ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /** Saves what changed. False when something needs fixing first. */
  const saveChanges = () => {
    const dateChanged = dueDate !== opened.dueDate;
    const reminderChanged = reminder !== (opened.reminderTime ?? "");
    const wrong = scheduleProblem(dueDate, reminder, today, {
      date: dateChanged,
      reminder: reminderChanged,
    });
    if (wrong) {
      setProblem(wrong);
      return false;
    }

    const changes: TodoChanges = {};
    const nextTitle = cleanTitle(title);
    // A name can't be emptied: clearing it puts the old one back.
    if (nextTitle && nextTitle !== opened.title) changes.title = nextTitle;
    const nextDescription = description.trim();
    if (nextDescription !== (opened.description?.trim() ?? "")) {
      changes.description = nextDescription || undefined;
    }
    if (dateChanged) changes.dueDate = dueDate;
    if (dueTime !== (opened.dueTime ?? "")) changes.dueTime = dueTime || undefined;
    if (priority !== opened.priority) changes.priority = priority;
    const nextDuration = duration ? Number(duration) : undefined;
    if (nextDuration !== (opened.duration || undefined)) changes.duration = nextDuration;
    if (reminderChanged) changes.reminderTime = reminder || undefined;

    if (Object.keys(changes).length > 0) onSave(changes);
    return true;
  };

  const close = () => {
    if (saveChanges()) onClose();
  };

  const toggle = () => {
    if (!saveChanges()) return;
    onToggle();
    onClose();
  };

  return (
    <Sheet
      label="Todo details"
      medium
      // While asking about deleting, closing means "no" first.
      onRequestClose={confirmingDelete ? () => setConfirmingDelete(false) : close}
    >
      <div className="absolute top-3 right-[52px] z-10">
        <OverflowMenu
          label="Todo options"
          actions={[
            { label: "Delete", destructive: true, onSelect: () => setConfirmingDelete(true) },
          ]}
        />
      </div>
      <div className="pr-[72px]">
        <textarea
          rows={1}
          value={title}
          maxLength={120}
          aria-label="Todo name"
          placeholder="Todo name"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className={`${TEXT_FIELD} py-1 text-[22px] leading-7 font-bold placeholder:text-muted ${
            todo.completed ? "text-subtle line-through" : "text-text"
          }`}
        />
      </div>
      <textarea
        rows={1}
        value={description}
        maxLength={500}
        aria-label="Description"
        placeholder="Add description"
        onChange={(event) => setDescription(event.target.value)}
        className={`${TEXT_FIELD} mt-1 max-h-40 py-1 text-base leading-[22px] text-muted placeholder:text-subtle`}
      />

      <div className="my-3 h-px bg-line" />

      <DateRow
        value={dueDate}
        time={dueTime}
        today={today}
        onChange={(date, time) => {
          setDueDate(date);
          setDueTime(time);
          setProblem(null);
        }}
      />
      <PriorityField value={priority} onChange={setPriority} />
      <DurationRow value={duration} onChange={setDuration} />
      <TimeRow
        icon={Bell}
        label="Reminder"
        value={reminder}
        reminderDate={dueDate}
        onChange={(value) => {
          setReminder(value);
          setProblem(null);
        }}
      />

      <ProblemLine message={problem} />
      {confirmingDelete ? (
        <div role="group" aria-label="Delete this todo?" className="mt-3">
          <p className="text-base font-semibold text-text">Delete this todo?</p>
          <p className="mt-1 text-sm leading-5 wrap-break-word text-muted">
            “{todo.title}” will be deleted. This can’t be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmingDelete(false)}
              className={`${MAIN_BUTTON} bg-field text-text hover:bg-line`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className={`${MAIN_BUTTON} bg-danger text-on-status hover:brightness-95`}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          className={`${MAIN_BUTTON} ${
            todo.completed
              ? "bg-field text-text hover:bg-line"
              : "bg-primary text-white hover:bg-primary-pressed"
          }`}
        >
          {todo.completed ? (
            <Undo2 aria-hidden="true" className="size-5" />
          ) : (
            <Check aria-hidden="true" className="size-5" />
          )}
          {todo.completed ? "Mark as not done" : "Mark as done"}
        </button>
      )}
    </Sheet>
  );
}
