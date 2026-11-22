"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  BLOCK_GAP,
  GRID_BOTTOM,
  GUTTER_WIDTH,
  HOURS,
  HourRow,
  ONE_LINE_HEIGHT,
  TimelineChip,
  layoutBlocks,
  offsetOf,
  useTimelineZoom,
} from "@/components/home/TodoTimeline";
import {
  addDays,
  formatDayMonth,
  formatDayRange,
  fromDateKey,
  shortWeekday,
  toDateKey,
  toDayMinutes,
  type DateKey,
} from "@/lib/dates";
import type { Todo } from "@/lib/todos";

/** The page's usual column, which the header and dates stay in while the calendar fills the page. */
export const PAGE_COLUMN = "mx-auto w-full max-w-[720px] px-4 md:px-8";

/** A day's column is never narrower than this, so as many days show as fit. */
const MIN_COLUMN_WIDTH = 130;
const MAX_COLUMN_WIDTH = 230;
const MAX_DAYS = 5;
/** The calendar stops growing here, with room for the times and its border. */
const MAX_FRAME_WIDTH = GUTTER_WIDTH + MAX_DAYS * MAX_COLUMN_WIDTH + 2;
const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";
const NAV_BUTTON = `flex size-9 cursor-pointer items-center justify-center rounded-lg text-text transition-colors enabled:hover:bg-field disabled:cursor-default disabled:opacity-30 ${FOCUS}`;

/**
 * Upcoming todos day by day: times down the left and one column per day from tomorrow, each laid
 * out like the timeline on Today. Untimed todos sit in an "All day" row above the hours.
 */
export function UpcomingCalendar({
  todos,
  today,
  onOpen,
}: {
  todos: readonly Todo[];
  today: DateKey;
  onOpen: (todo: Todo) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const { scroller, hourHeight, scrollToMinutes } = useTimelineZoom();
  const [dayCount, setDayCount] = useState(5);
  /** How many days past tomorrow the first column is. */
  const [offset, setOffset] = useState(0);
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});

  const firstDay = toDateKey(addDays(fromDateKey(today), 1 + offset));
  const days = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, index) =>
        toDateKey(addDays(fromDateKey(firstDay), index)),
      ),
    [firstDay, dayCount],
  );

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const fit = Math.floor((element.clientWidth - GUTTER_WIDTH) / MIN_COLUMN_WIDTH);
      setDayCount(Math.min(Math.max(fit, 1), MAX_DAYS));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const measureBlock = useCallback((id: string, height: number) => {
    setContentHeights((current) =>
      Math.abs((current[id] ?? 0) - height) < 1 ? current : { ...current, [id]: height },
    );
  }, []);

  const byDay = useMemo(() => {
    const grouped = new Map<DateKey, Todo[]>();
    for (const todo of todos) {
      const list = grouped.get(todo.dueDate);
      if (list) list.push(todo);
      else grouped.set(todo.dueDate, [todo]);
    }
    return grouped;
  }, [todos]);

  const columns = useMemo(
    () =>
      days.map((day) => {
        const items = byDay.get(day) ?? [];
        const timed = items
          .filter((todo): todo is Todo & { dueTime: string } => todo.dueTime !== undefined)
          .map((todo) => ({ todo, start: toDayMinutes(todo.dueTime) }))
          .sort((a, b) => a.start - b.start || a.todo.createdAt - b.todo.createdAt);
        const blocks = layoutBlocks(
          timed.map(({ todo, start }) => ({
            start,
            contentHeight: contentHeights[todo.id] ?? ONE_LINE_HEIGHT,
          })),
          hourHeight,
        );
        return { day, timed, blocks, allDay: items.filter((todo) => todo.dueTime === undefined) };
      }),
    [days, byDay, contentHeights, hourHeight],
  );

  const gridHeight = Math.max(
    offsetOf(24 * 60, hourHeight),
    ...columns.flatMap(({ blocks }) => blocks.map(({ top, height }) => top + height)),
  );
  const hasAllDay = columns.some(({ allDay }) => allDay.length > 0);
  const dayColumns: CSSProperties = {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
  };

  // Opens a little above the earliest todo showing, or at 8 am.
  const scrollToStart = useEffectEvent(() => {
    const starts = columns.flatMap(({ timed }) => timed.map(({ start }) => start));
    scrollToMinutes(starts.length > 0 ? Math.min(...starts) : 8 * 60);
  });
  useLayoutEffect(() => {
    scrollToStart();
  }, [firstDay]);

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-3 md:pb-4">
      <div className={`${PAGE_COLUMN} mb-3 flex shrink-0 items-center justify-between gap-2`}>
        <h2 aria-live="polite" className="truncate text-[17px] font-bold text-text">
          {formatDayRange(days[0], days[days.length - 1])}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {offset > 0 ? (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className={`mr-1 h-9 cursor-pointer rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-field ${FOCUS}`}
            >
              Tomorrow
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Earlier days"
            disabled={offset === 0}
            onClick={() => setOffset((current) => Math.max(current - dayCount, 0))}
            className={NAV_BUTTON}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Later days"
            onClick={() => setOffset((current) => current + dayCount)}
            className={NAV_BUTTON}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 md:px-4">
        <div
          ref={frame}
          style={{ maxWidth: MAX_FRAME_WIDTH }}
          className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-line"
        >
          <div className="flex shrink-0 border-b border-line bg-canvas">
            <span aria-hidden="true" className="shrink-0" style={{ width: GUTTER_WIDTH }} />
            <div className="grid min-w-0 flex-1" style={dayColumns}>
              {days.map((day) => (
                <div key={day} className="min-w-0 border-l border-line py-1.5 text-center">
                  <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">
                    {shortWeekday(fromDateKey(day))}
                  </span>
                  <span className="block truncate text-sm leading-5 font-bold text-text">
                    {formatDayMonth(day)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {hasAllDay ? (
            <div className="flex shrink-0 border-b border-line">
              <span
                style={{ width: GUTTER_WIDTH }}
                className="shrink-0 pt-2.5 pr-2 text-right text-[11px] text-muted"
              >
                All day
              </span>
              <div className="grid min-w-0 flex-1" style={dayColumns}>
                {columns.map(({ day, allDay }) => (
                  <div
                    key={day}
                    className="flex max-h-28 min-w-0 flex-col gap-1 overflow-y-auto border-l border-line p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {allDay.map((todo) => (
                      <TimelineChip key={todo.id} todo={todo} onOpen={onOpen} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1">
            <div
              ref={scroller}
              role="region"
              aria-label="Upcoming days"
              tabIndex={0}
              className={`absolute inset-0 touch-pan-y overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${FOCUS}`}
            >
              <div className="relative" style={{ height: gridHeight + GRID_BOTTOM }}>
                {HOURS.map((hour) => (
                  <HourRow key={hour} hour={hour} top={offsetOf(hour * 60, hourHeight) - 8} />
                ))}

                <div
                  className="absolute inset-y-0 right-0 grid"
                  style={{ ...dayColumns, left: GUTTER_WIDTH }}
                >
                  {columns.map(({ day, timed, blocks }) => (
                    <section
                      key={day}
                      aria-label={formatDayMonth(day)}
                      className="relative min-w-0 border-l border-line"
                    >
                      {timed.map(({ todo }, index) => (
                        <div
                          key={todo.id}
                          className="absolute inset-x-0.5"
                          style={{
                            top: blocks[index].top,
                            height: blocks[index].height,
                            paddingBottom: BLOCK_GAP,
                          }}
                        >
                          <TimelineChip
                            todo={todo}
                            onOpen={onOpen}
                            onMeasure={measureBlock}
                            showTime
                            fill
                            stacked
                          />
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
