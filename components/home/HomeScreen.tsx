"use client";

import { ChevronDown, GalleryVertical, ListTodo, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";

import { useApp } from "@/components/app/AppShell";
import { DateStrip } from "@/components/home/DateStrip";
import { TodoCard } from "@/components/home/TodoCard";
import { TodoListSkeleton } from "@/components/home/TodoListSkeleton";
import { TodoDetailsSheet } from "@/components/home/TodoSheets";
import { TodoTimeline } from "@/components/home/TodoTimeline";
import { useTodoView } from "@/hooks/useTodoView";
import {
  formatDayPhrase,
  formatLongDate,
  fromDateKey,
  headerMonth,
  type DateKey,
} from "@/lib/dates";
import { compareTodos, type Todo } from "@/lib/todos";

/** In the timeline, the page fits the window and only the hours scroll. */
const TIMELINE_PAGE =
  "-mb-6 flex h-[calc(100dvh-72px-env(safe-area-inset-bottom))] min-h-[480px] flex-col md:-mb-10 md:h-dvh md:min-h-[560px]";

/** The Today screen: the picked day's todos, the web version of the Android Todo tab. */
export function HomeScreen() {
  const { today, selected, selectDate, todos, status, retry, updateTodo, toggleTodo } = useApp();
  const { view, toggle: toggleView } = useTodoView();
  const [openId, setOpenId] = useState<string | null>(null);

  const { pending, completed } = useMemo(() => {
    const day = todos.filter((todo) => todo.dueDate === selected).sort(compareTodos);
    return {
      pending: day.filter((todo) => !todo.completed),
      completed: day.filter((todo) => todo.completed),
    };
  }, [todos, selected]);

  const openDetails = (todo: Todo) => setOpenId(todo.id);
  const detailsTodo = openId ? todos.find((todo) => todo.id === openId) : undefined;
  const dayTodos = useMemo(() => [...pending, ...completed], [pending, completed]);
  const showTimeline = view === "timeline" && status === "ready" && Boolean(today && selected);

  return (
    <div
      className={`mx-auto w-full max-w-[720px] px-4 md:px-8 ${showTimeline ? TIMELINE_PAGE : ""}`}
    >
      {today && selected ? (
        <>
          <DayHeader
            date={selected}
            showToday={selected !== today}
            onToday={() => selectDate(null)}
            isTimeline={view === "timeline"}
            onToggleView={toggleView}
          />
          <DateStrip
            today={today}
            selected={selected}
            // Landing on today goes back to following it, past midnight too.
            onSelect={(date) => selectDate(date === today ? null : date)}
          />

          {status === "loading" ? (
            <>
              <p role="status" className="sr-only">
                Loading your todos…
              </p>
              <TodoListSkeleton />
            </>
          ) : status === "error" ? (
            <LoadError onRetry={retry} />
          ) : showTimeline ? (
            <TodoTimeline todos={dayTodos} date={selected} onOpen={openDetails} />
          ) : pending.length === 0 && completed.length === 0 ? (
            <EmptyDay date={selected} now={fromDateKey(today)} />
          ) : (
            <div className="pt-3">
              {pending.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  now={fromDateKey(today)}
                  onOpen={openDetails}
                  onToggle={toggleTodo}
                />
              ))}
              {completed.length > 0 ? (
                <CompletedSection
                  todos={completed}
                  now={fromDateKey(today)}
                  onOpen={openDetails}
                  onToggle={toggleTodo}
                />
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div className="pt-9">
          <TodoListSkeleton />
        </div>
      )}

      {detailsTodo && today ? (
        <TodoDetailsSheet
          key={detailsTodo.id}
          todo={detailsTodo}
          today={today}
          onClose={() => setOpenId(null)}
          onSave={(changes) => updateTodo(detailsTodo.id, changes)}
          onToggle={() => toggleTodo(detailsTodo)}
        />
      ) : null}
    </div>
  );
}

/** "November 26": the month big, the year's last two digits in gray. */
function DayHeader({
  date,
  showToday,
  onToday,
  isTimeline,
  onToggleView,
}: {
  date: DateKey;
  showToday: boolean;
  onToday: () => void;
  isTimeline: boolean;
  onToggleView: () => void;
}) {
  const { month, year } = headerMonth(date);
  return (
    <header className="flex min-h-11 shrink-0 items-center justify-between gap-2 pt-9 pb-4">
      <h1
        aria-label={formatLongDate(date)}
        className="min-w-0 truncate text-[28px] leading-9 font-semibold tracking-[-0.8px] text-text"
      >
        {month} <span className="text-muted">{year}</span>
      </h1>
      <div className="flex shrink-0 items-center gap-1">
        {showToday ? (
          <button
            type="button"
            onClick={onToday}
            className="h-9 shrink-0 cursor-pointer rounded-full border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Today
          </button>
        ) : null}
        {/* Shows the view you're in, like the Android app's button. */}
        <button
          type="button"
          role="switch"
          aria-checked={isTimeline}
          aria-label="Timeline view"
          title={isTimeline ? "Switch to list" : "Switch to timeline"}
          onClick={onToggleView}
          className="-my-1 flex size-11 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-ink"
        >
          {isTimeline ? (
            <GalleryVertical aria-hidden="true" size={18.2} strokeWidth={2.2} />
          ) : (
            <Rows3 aria-hidden="true" size={20} />
          )}
        </button>
      </div>
    </header>
  );
}

function CompletedSection({
  todos,
  now,
  onOpen,
  onToggle,
}: {
  todos: Todo[];
  now: Date;
  onOpen: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section aria-label="Completed">
      <div className="pt-3 pb-1">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="flex cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-2 text-[15px] transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-ink"
        >
          <span className="font-semibold text-text">Completed</span>
          <span className="font-medium text-muted">{todos.length}</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-muted transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </button>
      </div>
      {expanded
        ? todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} now={now} onOpen={onOpen} onToggle={onToggle} />
          ))
        : null}
    </section>
  );
}

function EmptyDay({ date, now }: { date: DateKey; now: Date }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
      <ListTodo aria-hidden="true" strokeWidth={1.5} className="size-12 text-subtle" />
      <h2 className="mt-2 text-xl font-semibold text-text">No todos</h2>
      <p className="text-[15px] text-muted">
        Nothing due {formatDayPhrase(date, now)}. Click Add todo to add one.
      </p>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <p className="text-[15px] text-muted">Couldn’t load your todos.</p>
      <button
        type="button"
        onClick={onRetry}
        className="h-10 cursor-pointer rounded-xl bg-primary px-5 text-sm font-semibold text-ink transition-colors hover:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Try again
      </button>
    </div>
  );
}
