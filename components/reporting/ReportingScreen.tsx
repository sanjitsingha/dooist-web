"use client";

import { Circle, CircleCheck, History } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Avatar } from "@/components/app/AppNav";
import { useApp } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { TodoDetailsSheet } from "@/components/home/TodoSheets";
import { ActionBadge, REPORT_TYPES } from "@/components/reporting/ActionBadge";
import { DownloadReportButton } from "@/components/reporting/DownloadReportButton";
import { Pagination } from "@/components/reporting/Pagination";
import { ReportDateFilter } from "@/components/reporting/ReportDateFilter";
import { ReportTypeFilter } from "@/components/reporting/ReportTypeFilter";
import { useActivity } from "@/hooks/useActivity";
import {
  groupByDay,
  matchesDate,
  type ActivityEvent,
  type DateChoice,
  type ReportType,
} from "@/lib/activity";
import { formatActivityDay, fromDateKey, type DateKey } from "@/lib/dates";
import type { CurrentUser } from "@/lib/session";

/** Only one page of rows is on screen at a time, so a long history stays light. */
const PAGE_SIZE = 25;

const CHIP = "inline-flex h-7 min-w-0 items-center gap-1.5 rounded-lg border border-line px-2 text-sm text-text";

function ActivityRow({
  event,
  user,
  canOpen,
  onOpen,
}: {
  event: ActivityEvent;
  user: CurrentUser;
  /** False once the todo is deleted, since there's nothing left to open. */
  canOpen: boolean;
  onOpen: (todoId: string) => void;
}) {
  const TodoIcon = event.kind === "completed" ? CircleCheck : Circle;
  const chip = (
    <>
      <TodoIcon
        aria-hidden="true"
        className={`size-3.5 shrink-0 ${event.kind === "completed" ? "text-primary" : "text-muted"}`}
      />
      <span className={`truncate ${event.kind === "deleted" ? "text-muted line-through" : ""}`}>
        {event.title}
      </span>
    </>
  );
  return (
    <li className="flex min-h-12 items-center gap-2.5 px-2 py-2">
      <span className="relative shrink-0">
        <Avatar user={user} small />
        <ActionBadge
          type={event.kind}
          className="absolute -right-1 -bottom-1 border-2 border-page [&>svg]:size-2"
        />
      </span>
      <span className="shrink-0 pl-0.5 text-sm text-text">You {event.kind}</span>
      {canOpen ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Open ${event.title}`}
          onClick={() => onOpen(event.todoId)}
          className={`${CHIP} cursor-pointer transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink`}
        >
          {chip}
        </button>
      ) : (
        <span className={CHIP}>{chip}</span>
      )}
    </li>
  );
}

function ActivityFeed({
  events,
  today,
  user,
  openable,
  onOpen,
}: {
  events: readonly ActivityEvent[];
  today: DateKey;
  user: CurrentUser;
  /** The todos that still exist. */
  openable: ReadonlySet<string>;
  onOpen: (todoId: string) => void;
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  const now = fromDateKey(today);
  // A reload can shorten the list, so fall back to the last page that still exists.
  const page = Math.min(requestedPage, Math.ceil(events.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const days = useMemo(
    () => groupByDay(events.slice(start, start + PAGE_SIZE)),
    [events, start],
  );
  // A day's count is all of its activity, even when it runs across two pages.
  const totals = useMemo(
    () => new Map(groupByDay(events).map(({ day, items }) => [day, items.length])),
    [events],
  );

  const goToPage = (next: number) => {
    // The new rows have to be in place first, or the browser holds on to the old scroll position.
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
          <ul className="border-b border-line py-0.5">
            {items.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                user={user}
                canOpen={openable.has(event.todoId)}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      ))}
      <Pagination page={page} pageSize={PAGE_SIZE} total={events.length} onChange={goToPage} />
    </div>
  );
}

function Empty({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
      <History aria-hidden="true" strokeWidth={1.5} className="size-12 text-subtle" />
      <h2 className="mt-2 text-xl font-semibold text-text">{heading}</h2>
      <p className="text-[15px] text-muted">{text}</p>
    </div>
  );
}

/** A log of what happened to your todos, by day, with filters for the action and the date. */
export function ReportingScreen() {
  const { user, today, todos, whenSaved, updateTodo, toggleTodo, deleteTodo } = useApp();
  const { events, status, retry } = useActivity(user.id, todos, whenSaved);
  const [types, setTypes] = useState<readonly ReportType[]>([]);
  const [date, setDate] = useState<DateChoice>("today");
  const [openId, setOpenId] = useState<string | null>(null);
  const openable = useMemo(() => new Set(todos.map((todo) => todo.id)), [todos]);
  const detailsTodo = openId ? todos.find((todo) => todo.id === openId) : undefined;

  const everyType = types.length === 0 || types.length === REPORT_TYPES.length;
  const shown = useMemo(
    () =>
      today
        ? events.filter(
            (event) =>
              (everyType || types.includes(event.kind)) && matchesDate(event.at, date, today),
          )
        : [],
    [events, everyType, types, date, today],
  );
  const onlyUncompleted = types.length === 1 && types[0] === "uncompleted";

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 md:px-8">
      <PageHeader title="Reporting" />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ReportTypeFilter selected={types} onChange={setTypes} />
        <ReportDateFilter choice={date} today={today} onChange={setDate} />
        <DownloadReportButton
          events={shown}
          types={types}
          date={date}
          today={today}
          user={user}
          disabled={status !== "ready" || shown.length === 0}
        />
      </div>

      {status === "error" ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <p className="text-[15px] text-muted">Couldn’t load your activity.</p>
          <button
            type="button"
            onClick={retry}
            className="h-10 cursor-pointer rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Try again
          </button>
        </div>
      ) : status === "loading" || !today ? (
        <div role="status" aria-label="Loading activity" className="animate-pulse">
          <div className="mb-3 h-5 w-48 rounded-sm bg-field" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="mb-3 h-9 rounded-lg bg-field" />
          ))}
        </div>
      ) : onlyUncompleted ? (
        <Empty
          heading="Uncompleted isn’t tracked yet"
          text="Marking a todo as not done isn’t saved in your history."
        />
      ) : events.length === 0 ? (
        <Empty heading="No activity yet" text="Add a todo and it will show up here." />
      ) : shown.length === 0 ? (
        <Empty heading="No activity found" text="Try a different action or date." />
      ) : (
        <ActivityFeed
          key={`${types.join()}|${date}`}
          events={shown}
          today={today}
          user={user}
          openable={openable}
          onOpen={setOpenId}
        />
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
