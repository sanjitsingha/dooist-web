"use client";

import { CalendarClock, CalendarDays, Rows3 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { useApp } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadError } from "@/components/home/HomeScreen";
import { TodoCard } from "@/components/home/TodoCard";
import { TodoListSkeleton } from "@/components/home/TodoListSkeleton";
import { TodoDetailsSheet } from "@/components/home/TodoSheets";
import { Pagination } from "@/components/reporting/Pagination";
import { PAGE_COLUMN, UpcomingCalendar } from "@/components/upcoming/UpcomingCalendar";
import { useUpcomingView } from "@/hooks/useUpcomingView";
import { formatActivityDay, fromDateKey, type DateKey } from "@/lib/dates";
import { compareTodos, type Todo } from "@/lib/todos";

/**
 * The day-by-day calendar and its toggle, turned off for now but kept to work on later. Setting
 * this to true brings both back (components/upcoming/UpcomingCalendar.tsx).
 */
const CALENDAR_VIEW_ENABLED: boolean = false;

/** In the calendar, the page fits the window, above the bar on phones, and only the hours scroll. */
const GRID_PAGE =
  "-mb-6 flex h-[calc(100dvh-72px-env(safe-area-inset-bottom))] min-h-[480px] flex-col md:-mb-10 md:h-dvh md:min-h-[560px]";

/** Only one page of todos is on screen at a time, so a long list stays light. */
const PAGE_SIZE = 25;

/** Todos in order, under the day each is due. */
function groupByDueDate(todos: readonly Todo[]) {
  const days = new Map<DateKey, Todo[]>();
  for (const todo of todos) {
    const list = days.get(todo.dueDate);
    if (list) list.push(todo);
    else days.set(todo.dueDate, [todo]);
  }
  return [...days].map(([day, items]) => ({ day, items }));
}

function UpcomingList({
  todos,
  today,
  onOpen,
  onToggle,
}: {
  todos: readonly Todo[];
  today: DateKey;
  onOpen: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  const now = fromDateKey(today);
  // Finishing todos can shorten the list, so fall back to the last page that still exists.
  const page = Math.min(requestedPage, Math.ceil(todos.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const days = useMemo(
    () => groupByDueDate(todos.slice(start, start + PAGE_SIZE)),
    [todos, start],
  );
  // A day's count is all of its todos, even when it runs across two pages.
  const totals = useMemo(
    () => new Map(groupByDueDate(todos).map(({ day, items }) => [day, items.length])),
    [todos],
  );

  const goToPage = (next: number) => {
    // The new todos have to be in place first, or the browser holds on to the old scroll position.
    flushSync(() => setRequestedPage(next));
    top.current?.scrollIntoView({ block: "start" });
    top.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={top} tabIndex={-1} className="scroll-mt-4 outline-none">
      {days.map(({ day, items }) => (
        <section key={day} className="mb-5">
          <h2 className="flex items-baseline gap-2 border-b border-line px-0.5 pb-2 text-sm font-bold text-text">
            {formatActivityDay(day, now)}
            <span className="font-normal text-muted">{totals.get(day)}</span>
          </h2>
          <div className="pt-2">
            {items.map((todo) => (
              <TodoCard key={todo.id} todo={todo} now={now} onOpen={onOpen} onToggle={onToggle} />
            ))}
          </div>
        </section>
      ))}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={todos.length}
        label="Upcoming pages"
        onChange={goToPage}
      />
    </div>
  );
}

/** Every open todo due after today, soonest first, under its date. Today has its own page. */
export function UpcomingScreen() {
  const { today, todos, status, retry, updateTodo, toggleTodo, deleteTodo, openAddAt } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const detailsTodo = openId ? todos.find((todo) => todo.id === openId) : undefined;
  const { view, toggle: toggleView } = useUpcomingView();
  const isGrid = CALENDAR_VIEW_ENABLED && view === "grid";

  const upcoming = useMemo(
    () =>
      today
        ? todos
            .filter((todo) => !todo.completed && todo.dueDate > today)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || compareTodos(a, b))
        : [],
    [todos, today],
  );

  return (
    <div className={isGrid ? GRID_PAGE : ""}>
      {/* The same place in both views. Only the calendar is bigger. */}
      <div className={PAGE_COLUMN}>
        <PageHeader title="Upcoming">
          {/* Shows the view you're in, like the button on Today. */}
          {CALENDAR_VIEW_ENABLED ? (
            <button
              type="button"
              role="switch"
              aria-checked={isGrid}
              aria-label="Calendar view"
              title={isGrid ? "Switch to list" : "Switch to calendar"}
              onClick={toggleView}
              className="-my-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-ink"
            >
              {isGrid ? (
                <CalendarDays aria-hidden="true" size={20} />
              ) : (
                <Rows3 aria-hidden="true" size={20} />
              )}
            </button>
          ) : null}
        </PageHeader>
      </div>

      {isGrid && status === "ready" && today ? (
        <UpcomingCalendar
          todos={upcoming}
          today={today}
          onOpen={(todo) => setOpenId(todo.id)}
          onAddAt={openAddAt}
        />
      ) : (
        <div className={PAGE_COLUMN}>
          {status === "error" ? (
            <LoadError onRetry={retry} />
          ) : status === "loading" || !today ? (
            <>
              <p role="status" className="sr-only">
                Loading your todos…
              </p>
              <TodoListSkeleton />
            </>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
              <CalendarClock aria-hidden="true" strokeWidth={1.5} className="size-12 text-subtle" />
              <h2 className="mt-2 text-xl font-semibold text-text">No upcoming todos</h2>
              <p className="text-[15px] text-muted">Todos due after today will show up here.</p>
            </div>
          ) : (
            <UpcomingList
              todos={upcoming}
              today={today}
              onOpen={(todo) => setOpenId(todo.id)}
              onToggle={toggleTodo}
            />
          )}
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
          onDelete={() => deleteTodo(detailsTodo.id)}
        />
      ) : null}
    </div>
  );
}
