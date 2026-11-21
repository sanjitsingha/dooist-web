"use client";

import {
  Bell,
  Calendar,
  Check,
  Clock,
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

import { formatDuration, fromDateKey, type DateKey } from "@/lib/dates";
import {
  PRIORITIES,
  priorityOf,
  type NewTodo,
  type Priority,
  type Todo,
  type TodoChanges,
} from "@/lib/todos";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const CONTROL =
  "h-9 rounded-lg border-[1.5px] border-transparent bg-field px-2.5 text-sm font-medium text-text outline-none transition-colors focus:border-primary focus:bg-white";
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

/** A bottom sheet on phones and a centered panel on desktop. */
function Sheet({
  label,
  large = false,
  onRequestClose,
  children,
}: {
  label: string;
  /** A wider panel with more room around it, on desktop. */
  large?: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
      onMouseDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a full click on the backdrop, not a text selection dragged out of the sheet.
        if (event.target === event.currentTarget && pressedBackdrop.current) onRequestClose();
      }}
      className={`mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white text-text backdrop:bg-ink/30 md:m-auto md:rounded-3xl ${
        large ? "md:w-[640px]" : "md:w-[480px]"
      }`}
    >
      <div
        className={`relative px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] ${
          large ? "md:p-8" : ""
        }`}
      >
        <button
          type="button"
          onClick={onRequestClose}
          aria-label="Close"
          className={`absolute top-3 right-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink ${
            large ? "md:top-6 md:right-6" : ""
          }`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
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

/** A time box with a clear button once it has a value. */
function TimeRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Row icon={icon} label={label} htmlFor={id}>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Remove ${label.toLowerCase()}`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <input
        id={id}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      />
    </Row>
  );
}

function DateRow({ value, min, onChange }: { value: string; min?: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <Row icon={Calendar} label="Due date" htmlFor={id}>
      <input
        id={id}
        type="date"
        required
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      />
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
        <Flag className={`size-5 ${priorityOf(value).icon}`} />
        Priority
      </span>
      <div className="flex gap-1">
        {PRIORITIES.map((priority) => {
          const checked = priority.value === value;
          return (
            <label
              key={priority.value}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ink ${
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
  onAdd,
  onClose,
}: {
  today: DateKey;
  startDate: DateKey;
  onAdd: (todo: NewTodo) => void;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const durationId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(startDate < today ? today : startDate);
  const [dueTime, setDueTime] = useState("");
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
    <Sheet label="Add todo" large onRequestClose={onClose}>
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
          className={`${TEXT_FIELD} mt-1 max-h-40 py-1 text-base leading-[22px] placeholder:text-muted md:min-h-12`}
        />

        <div className="mt-1">
          <DateRow
            value={dueDate}
            min={today}
            onChange={(value) => {
              setDueDate(value);
              setProblem(null);
            }}
          />
          <TimeRow icon={Clock} label="Time" value={dueTime} onChange={setDueTime} />
          <PriorityField value={priority} onChange={setPriority} />
          <Row icon={Hourglass} label="Duration" htmlFor={durationId}>
            <select
              id={durationId}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className={`${CONTROL} cursor-pointer`}
            >
              <option value="">None</option>
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </select>
          </Row>
          <TimeRow
            icon={Bell}
            label="Reminder"
            value={reminder}
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
          className={`${MAIN_BUTTON} bg-primary text-ink enabled:hover:bg-primary-pressed`}
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
  onClose,
}: {
  todo: Todo;
  today: DateKey;
  onSave: (changes: TodoChanges) => void;
  onToggle: () => void;
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
  const [reminder, setReminder] = useState(todo.reminderTime ?? "");
  const [problem, setProblem] = useState<string | null>(null);

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
    <Sheet label="Todo details" onRequestClose={close}>
      <div className="pr-8">
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
        onChange={(value) => {
          setDueDate(value);
          setProblem(null);
        }}
      />
      <TimeRow icon={Clock} label="Time" value={dueTime} onChange={setDueTime} />
      <PriorityField value={priority} onChange={setPriority} />
      <TimeRow
        icon={Bell}
        label="Reminder"
        value={reminder}
        onChange={(value) => {
          setReminder(value);
          setProblem(null);
        }}
      />

      <ProblemLine message={problem} />
      <button
        type="button"
        onClick={toggle}
        className={`${MAIN_BUTTON} ${
          todo.completed
            ? "bg-field text-text hover:bg-line"
            : "bg-primary text-ink hover:bg-primary-pressed"
        }`}
      >
        {todo.completed ? (
          <Undo2 aria-hidden="true" className="size-5" />
        ) : (
          <Check aria-hidden="true" className="size-5" />
        )}
        {todo.completed ? "Mark as not done" : "Mark as done"}
      </button>
    </Sheet>
  );
}
