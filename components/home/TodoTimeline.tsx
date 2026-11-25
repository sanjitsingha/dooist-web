"use client";

import {
  memo,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNow } from "@/hooks/useNow";
import {
  MINUTES_PER_DAY,
  formatTime,
  toDateKey,
  toDayMinutes,
  type DateKey,
  type TimeKey,
} from "@/lib/dates";
import { priorityOf, type Todo } from "@/lib/todos";

/** How tall an hour is: fully zoomed out, at first, and fully zoomed in. */
const MIN_HOUR_HEIGHT = 48;
const DEFAULT_HOUR_HEIGHT = 64;
const MAX_HOUR_HEIGHT = 240;
export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * The ticks between the hour labels, in the time column on the left like a ruler's, which fade in
 * while zooming in, more of them the further in: half past from 80px an hour (fully there by
 * 110px), quarter past and quarter to from 120px (by 160px), then every five minutes from 180px
 * (by 230px). The closer together, the shorter and lighter, so the hours still stand out. They
 * stay out of the todos' area. The Android timeline has the same ticks, up to quarter hours.
 */
const SUB_HOUR_TICKS = [
  { step: 30, minutes: [30], width: 14, fadeFrom: 80, fadeTo: 110, opacity: 1 },
  { step: 15, minutes: [15, 45], width: 9, fadeFrom: 120, fadeTo: 160, opacity: 0.8 },
  {
    step: 5,
    minutes: [5, 10, 20, 25, 35, 40, 50, 55],
    width: 5,
    fadeFrom: 180,
    fadeTo: 230,
    opacity: 0.6,
  },
] as const;

/** Room on the left for the time labels. */
export const GUTTER_WIDTH = 56;
/** Space above 12 am, so its label isn't cut off. */
const GRID_TOP = 10;
/** Room below 11 pm for a block that starts late to run past midnight. */
export const GRID_BOTTOM = 64;
/** A block reaches at most half an hour down. */
const BLOCK_MINUTES = 30;
/** Space below each block, so stacked blocks don't touch. */
export const BLOCK_GAP = 2;
/** How tall a one-line title is, until a block has been measured. */
export const ONE_LINE_HEIGHT = 28;
/** How much of the day shows above the time the timeline opens at. */
const LEAD_MINUTES = 120;

// Kept while the app is open, so switching views or days doesn't reset the zoom.
let savedHourHeight = DEFAULT_HOUR_HEIGHT;
function rememberZoom(height: number) {
  savedHourHeight = height;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const clampHeight = (height: number) => clamp(height, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT);
export const offsetOf = (minutes: number, hourHeight: number) => GRID_TOP + (minutes / 60) * hourHeight;
const hourLabel = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? "am" : "pm"}`;

type BlockInput = { start: number; contentHeight: number };

/**
 * Where each block goes at this zoom, the same rules as the Android timeline. A block starts at
 * its time and reaches down to the next todo's time (at most half an hour), but is never shorter
 * than its title. Todos too close for that are pushed down, so they stack instead of overlapping.
 */
export function layoutBlocks(inputs: readonly BlockInput[], hourHeight: number) {
  let previousBottom = 0;
  return inputs.map(({ start, contentHeight }, index) => {
    const next = inputs[index + 1];
    const top = Math.max(offsetOf(start, hourHeight), previousBottom);
    const end = Math.min(
      offsetOf(start + BLOCK_MINUTES, hourHeight),
      next ? offsetOf(next.start, hourHeight) : Infinity,
    );
    const height = Math.max(contentHeight + BLOCK_GAP, end - top);
    previousBottom = top + height;
    return { top, height };
  });
}

/**
 * How tall an hour is, and the scrolling element it zooms. Zooms with a pinch or Ctrl + scroll
 * (which is also how a trackpad pinch arrives), keeping the same time under the fingers.
 */
export function useTimelineZoom() {
  const scroller = useRef<HTMLDivElement>(null);
  const [hourHeight, setHourHeight] = useState(savedHourHeight);
  const latestHeight = useRef(savedHourHeight);
  /** Where to scroll once a new zoom is on the page, so the same time stays in place. */
  const pendingTop = useRef<number | null>(null);

  const anchorAt = useCallback((focalY: number) => {
    const top = pendingTop.current ?? scroller.current?.scrollTop ?? 0;
    return ((top + focalY - GRID_TOP) / latestHeight.current) * 60;
  }, []);

  const zoomAround = useCallback((height: number, anchorMinutes: number, focalY: number) => {
    const next = clampHeight(height);
    if (next === latestHeight.current) return;
    latestHeight.current = next;
    rememberZoom(next);
    pendingTop.current = Math.max(offsetOf(anchorMinutes, next) - focalY, 0);
    setHourHeight(next);
  }, []);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && pendingTop.current !== null) {
      element.scrollTop = pendingTop.current;
      pendingTop.current = null;
    }
  }, [hourHeight]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    let pinch: { distance: number; height: number; anchor: number; focal: number } | null = null;

    const spread = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const focalOf = (clientY: number) => clientY - element.getBoundingClientRect().top;

    // A trackpad pinch arrives as a wheel event with Ctrl held.
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const focal = focalOf(event.clientY);
      zoomAround(latestHeight.current * Math.exp(-event.deltaY * 0.01), anchorAt(focal), focal);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      const focal = focalOf((event.touches[0].clientY + event.touches[1].clientY) / 2);
      pinch = {
        distance: spread(event.touches) || 1,
        height: latestHeight.current,
        anchor: anchorAt(focal),
        focal,
      };
      // Stops the drag from scrolling while the fingers zoom.
      element.style.overflowY = "hidden";
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length < 2) return;
      if (event.cancelable) event.preventDefault();
      zoomAround(
        pinch.height * (spread(event.touches) / pinch.distance),
        pinch.anchor,
        pinch.focal,
      );
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!pinch || event.touches.length >= 2) return;
      pinch = null;
      element.style.removeProperty("overflow-y");
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [anchorAt, zoomAround]);

  /** Scrolls so this time of day sits a little below the top. */
  const scrollToMinutes = useCallback((minutes: number) => {
    const element = scroller.current;
    if (!element) return;
    element.scrollTop = Math.max(offsetOf(minutes - LEAD_MINUTES, latestHeight.current), 0);
  }, []);

  return { scroller, hourHeight, scrollToMinutes };
}

/** The drag handle's three short lines, narrower than a menu icon's. */
function GripLines() {
  return (
    <svg
      viewBox="0 0 10 14"
      aria-hidden="true"
      className="h-3.5 w-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <path d="M2 4h6M2 7h6M2 10h6" />
    </svg>
  );
}

/** How close to the top or bottom a dragged todo has to be for the timeline to scroll. */
const DRAG_EDGE = 48;
/** The fastest that scrolls, in pixels a frame, right at the edge. */
const DRAG_SCROLL_STEP = 14;
/** How far the pointer has to go before it counts as a drag. */
const DRAG_THRESHOLD = 3;

type DragSession = {
  todo: Todo;
  pointerId: number;
  /** From the todo's time on the grid down to where it was grabbed. */
  grab: number;
  startY: number;
  clientY: number;
  hourHeight: number;
  moved: boolean;
  minutes: number;
  frame: number;
  /** Takes away everything the drag set up. */
  stop: () => void;
};

/**
 * How long a todo takes to land on its line once it's let go. The same as the transition on a
 * landing block (in its class, which has to be written out in full).
 */
const SETTLE_MS = 200;

/**
 * Dragging a todo by its handle to another time. It glides with the pointer, while its time and
 * the orange mark show the line it would snap to, like the mark. The timeline scrolls when it's
 * held near the top or bottom, Esc puts it back, and on letting go it springs onto its line and
 * the new time is saved. The arrow keys on the handle move it a line at a time.
 */
function useTimeDrag(
  scroller: RefObject<HTMLDivElement | null>,
  grid: RefObject<HTMLDivElement | null>,
  hourHeight: number,
  todos: readonly unknown[],
  onMove: ((todo: Todo, time: TimeKey) => void) | undefined,
) {
  /** The todo being dragged: the time it would snap to, and where it is now, unsnapped. */
  const [dragging, setDragging] = useState<{ id: string; minutes: number; top: number } | null>(
    null,
  );
  /** The todo landing on its line, for as long as that takes. */
  const [settling, setSettling] = useState<string | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const session = useRef<DragSession | null>(null);
  /** The handle to keep focus on once a todo moved with the keyboard has been redrawn. */
  const refocus = useRef<string | null>(null);

  const follow = useCallback(
    (drag: DragSession) => {
      const gridTop = grid.current?.getBoundingClientRect().top ?? 0;
      const step = snapMinutes(drag.hourHeight);
      const top = drag.clientY - gridTop - drag.grab;
      const raw = ((top - GRID_TOP) / drag.hourHeight) * 60;
      const minutes = clamp(Math.round(raw / step) * step, 0, MINUTES_PER_DAY - step);
      drag.minutes = minutes;
      setDragging({
        id: drag.todo.id,
        minutes,
        top: clamp(
          top,
          offsetOf(0, drag.hourHeight),
          offsetOf(MINUTES_PER_DAY - step, drag.hourHeight),
        ),
      });
    },
    [grid],
  );

  const settle = useCallback((id: string) => {
    clearTimeout(settleTimer.current);
    setSettling(id);
    settleTimer.current = setTimeout(() => setSettling(null), SETTLE_MS + 50);
  }, []);

  const end = useCallback(() => {
    const drag = session.current;
    if (!drag) return;
    session.current = null;
    drag.stop();
    setDragging(null);
    // From wherever it was let go, onto its line (or back where it was).
    if (drag.moved) settle(drag.todo.id);
  }, [settle]);

  // Leaving the page mid-drag.
  useEffect(
    () => () => {
      end();
      clearTimeout(settleTimer.current);
    },
    [end],
  );

  useLayoutEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    const handle = grid.current?.querySelector<HTMLElement>(`[data-move="${CSS.escape(id)}"]`);
    if (handle && document.activeElement !== handle) handle.focus();
  }, [grid, todos]);

  const start = (event: PointerEvent<HTMLButtonElement>, todo: Todo, startMinutes: number) => {
    if (!onMove || event.button !== 0 || session.current || !grid.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    // The grabbing hand stays wherever the pointer goes, and nothing gets selected on the way.
    const body = document.body.style;
    body.cursor = "grabbing";
    body.userSelect = "none";
    const onKey = (key: globalThis.KeyboardEvent) => {
      if (key.key === "Escape") end();
    };
    window.addEventListener("keydown", onKey);

    const drag: DragSession = {
      todo,
      pointerId: event.pointerId,
      grab:
        event.clientY -
        grid.current.getBoundingClientRect().top -
        offsetOf(startMinutes, hourHeight),
      startY: event.clientY,
      clientY: event.clientY,
      hourHeight,
      moved: false,
      minutes: startMinutes,
      frame: 0,
      stop: () => {
        cancelAnimationFrame(drag.frame);
        window.removeEventListener("keydown", onKey);
        body.removeProperty("cursor");
        body.removeProperty("user-select");
      },
    };

    // Near the top or bottom, the timeline scrolls, faster the closer it's held to the edge.
    const scroll = () => {
      const element = scroller.current;
      if (element && drag.moved) {
        const box = element.getBoundingClientRect();
        const over =
          drag.clientY < box.top + DRAG_EDGE
            ? drag.clientY - (box.top + DRAG_EDGE)
            : drag.clientY > box.bottom - DRAG_EDGE
              ? drag.clientY - (box.bottom - DRAG_EDGE)
              : 0;
        if (over !== 0) {
          const speed = Math.min(
            DRAG_SCROLL_STEP,
            Math.ceil((Math.abs(over) / DRAG_EDGE) * DRAG_SCROLL_STEP),
          );
          const before = element.scrollTop;
          element.scrollTop += Math.sign(over) * speed;
          if (element.scrollTop !== before) follow(drag);
        }
      }
      drag.frame = requestAnimationFrame(scroll);
    };
    drag.frame = requestAnimationFrame(scroll);
    session.current = drag;
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = session.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.clientY = event.clientY;
    drag.hourHeight = hourHeight;
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < DRAG_THRESHOLD) return;
    drag.moved = true;
    follow(drag);
  };

  const drop = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = session.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    end();
    if (!drag.moved || !onMove) return;
    const time = toTimeKey(drag.minutes);
    if (time !== drag.todo.dueTime) onMove(drag.todo, time);
  };

  const cancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (session.current?.pointerId === event.pointerId) end();
  };

  /** Up or down to the next line showing. */
  const nudge = (event: KeyboardEvent<HTMLButtonElement>, todo: Todo, startMinutes: number) => {
    if (!onMove || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const step = snapMinutes(hourHeight);
    const next =
      event.key === "ArrowDown"
        ? Math.floor(startMinutes / step) * step + step
        : Math.ceil(startMinutes / step) * step - step;
    const minutes = clamp(next, 0, MINUTES_PER_DAY - step);
    if (minutes === startMinutes) return;
    refocus.current = todo.id;
    settle(todo.id);
    onMove(todo, toTimeKey(minutes));
  };

  return { dragging, settling, start, move, drop, cancel, nudge };
}

/**
 * The picked day like a calendar's day view: times down the left, each timed todo as a block
 * tinted by priority, untimed todos in an "All day" row, and a red line at the current time.
 * Zooms with a pinch or Ctrl + scroll (which is also how a trackpad pinch arrives). With
 * `onAddAt`, a short orange line in the time column follows the mouse, snapped to the ticks, and
 * a click adds a todo there. With `onMove`, each timed todo has a handle on its right to drag it
 * to another time.
 */
export function TodoTimeline({
  todos,
  date,
  onOpen,
  onAddAt,
  onMove,
}: {
  todos: readonly Todo[];
  date: DateKey;
  onOpen: (todo: Todo) => void;
  /** Adds a todo at a time clicked on the timeline. Left out on days gone by. */
  onAddAt?: (date: DateKey, time: TimeKey) => void;
  /** Gives a todo a new time, dragged to on the timeline. Left out on days gone by. */
  onMove?: (todo: Todo, time: TimeKey) => void;
}) {
  const now = useNow();
  const isToday = date === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const grid = useRef<HTMLDivElement>(null);
  const { scroller, hourHeight, scrollToMinutes } = useTimelineZoom();
  const { slot, hide, handlers } = useSlotHover(hourHeight, () => date, onAddAt);
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});

  const measureBlock = useCallback((id: string, height: number) => {
    setContentHeights((current) =>
      Math.abs((current[id] ?? 0) - height) < 1 ? current : { ...current, [id]: height },
    );
  }, []);

  const timed = useMemo(
    () =>
      todos
        .filter((todo): todo is Todo & { dueTime: string } => todo.dueTime !== undefined)
        .map((todo) => ({ todo, start: toDayMinutes(todo.dueTime) }))
        .sort((a, b) => a.start - b.start || a.todo.createdAt - b.todo.createdAt),
    [todos],
  );
  const allDay = useMemo(() => todos.filter((todo) => todo.dueTime === undefined), [todos]);
  const blocks = useMemo(
    () =>
      layoutBlocks(
        timed.map(({ todo, start }) => ({
          start,
          contentHeight: contentHeights[todo.id] ?? ONE_LINE_HEIGHT,
        })),
        hourHeight,
      ),
    [timed, contentHeights, hourHeight],
  );
  const drag = useTimeDrag(scroller, grid, hourHeight, timed, onMove);
  const lastBlock = blocks[blocks.length - 1];
  const gridHeight = Math.max(
    offsetOf(24 * 60, hourHeight),
    lastBlock ? lastBlock.top + lastBlock.height : 0,
  );

  // Opens two hours above now (today), the first timed todo, or 8 am.
  const scrollToStart = useEffectEvent(() => {
    const current = new Date();
    scrollToMinutes(
      date === toDateKey(current)
        ? current.getHours() * 60 + current.getMinutes()
        : (timed[0]?.start ?? 8 * 60),
    );
  });
  // Also runs when Next.js shows this page again after another one, like the Android tab.
  useLayoutEffect(() => {
    scrollToStart();
  }, [date]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {allDay.length > 0 ? (
        <div className="flex shrink-0 items-start border-b border-line pt-1 pb-2">
          <span
            style={{ width: GUTTER_WIDTH }}
            className="shrink-0 pt-1.5 pr-2 text-right text-[11px] text-muted"
          >
            All day
          </span>
          <div className="flex max-h-28 min-w-0 flex-1 flex-col gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allDay.map((todo) => (
              <TimelineChip key={todo.id} todo={todo} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={hide}
          role="region"
          aria-label="Timeline"
          tabIndex={0}
          className="absolute inset-0 touch-pan-y overflow-y-auto overscroll-y-contain [scrollbar-width:none] focus-visible:outline-2 [&::-webkit-scrollbar]:hidden focus-visible:-outline-offset-2 focus-visible:outline-ink"
        >
          <div
            ref={grid}
            {...handlers}
            className={`relative ${
              drag.dragging ? "cursor-grabbing [&_*]:cursor-grabbing" : slot ? "cursor-pointer" : ""
            }`}
            style={{ height: gridHeight + GRID_BOTTOM }}
          >
            <SubHourLines hourHeight={hourHeight} />
            {HOURS.map((hour) => (
              <HourRow key={hour} hour={hour} top={offsetOf(hour * 60, hourHeight) - 8} />
            ))}

            {timed.map(({ todo, start }, index) => {
              // While it's dragged, it follows the pointer, showing the time it would snap to.
              const dragged = drag.dragging?.id === todo.id ? drag.dragging : null;
              const landing = drag.settling === todo.id;
              return (
                <div
                  key={todo.id}
                  className={`absolute right-0 ${dragged ? "z-20 drop-shadow-lg" : ""} ${
                    landing ? "z-20 [transition:top_200ms_cubic-bezier(0.34,1.56,0.64,1),filter_150ms_ease-out] motion-reduce:[transition:none]" : ""
                  }`}
                  style={{
                    left: GUTTER_WIDTH,
                    top: dragged ? dragged.top : blocks[index].top,
                    height: blocks[index].height,
                    paddingBottom: BLOCK_GAP,
                  }}
                >
                  <TimelineChip
                    todo={dragged ? { ...todo, dueTime: toTimeKey(dragged.minutes) } : todo}
                    onOpen={onOpen}
                    onMeasure={measureBlock}
                    showTime
                    fill
                    handleSpace={Boolean(onMove)}
                  />
                  {onMove ? (
                    <button
                      type="button"
                      data-move={todo.id}
                      aria-label={`Move ${todo.title} to another time`}
                      aria-keyshortcuts="ArrowUp ArrowDown"
                      title="Drag to change the time"
                      onPointerDown={(event) => drag.start(event, todo, start)}
                      onPointerMove={drag.move}
                      onPointerUp={drag.drop}
                      onPointerCancel={drag.cancel}
                      onLostPointerCapture={drag.cancel}
                      onKeyDown={(event) => drag.nudge(event, todo, start)}
                      // Centered on the box, which stops BLOCK_GAP short of the bottom.
                      className={`absolute top-[calc(50%-1px)] right-1 flex h-6 w-4 -translate-y-1/2 touch-none items-center justify-center rounded transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ink ${
                        dragged ? "cursor-grabbing" : "cursor-grab opacity-60 hover:opacity-100"
                      } ${todo.completed ? "text-muted" : priorityOf(todo.priority).title}`}
                    >
                      <GripLines />
                    </button>
                  ) : null}
                </div>
              );
            })}

            {drag.dragging ? (
              <SlotMark minutes={drag.dragging.minutes} hourHeight={hourHeight} />
            ) : slot ? (
              <SlotMark minutes={slot.minutes} hourHeight={hourHeight} />
            ) : null}

            {isToday ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 z-10 flex h-2 items-center"
                style={{ left: GUTTER_WIDTH - 4, top: offsetOf(nowMinutes, hourHeight) - 4 }}
              >
                <span className="size-2 shrink-0 rounded-full bg-danger" />
                <span className="h-0.5 flex-1 bg-danger" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export const HourRow = memo(function HourRow({ hour, top }: { hour: number; top: number }) {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 flex h-4 items-center" style={{ top }}>
      <span
        style={{ width: GUTTER_WIDTH }}
        className="shrink-0 pr-2 text-right text-[11px] text-muted"
      >
        {hourLabel(hour)}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
});

/**
 * How far apart the times are that the mouse snaps to: the closest ticks showing (once they're
 * half faded in), or whole hours before any do. 60, 30, 15 or 5 minutes.
 */
function snapMinutes(hourHeight: number): number {
  let snap = 60;
  for (const { step, fadeFrom, fadeTo } of SUB_HOUR_TICKS) {
    if (hourHeight >= (fadeFrom + fadeTo) / 2) snap = Math.min(snap, step);
  }
  return snap;
}

/** A time of day the mouse is over, on a day, snapped to the ticks. */
export type Slot = { date: DateKey; minutes: number };

const toTimeKey = (minutes: number): TimeKey =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * The mouse over a timeline's empty space: which day and time it's on, snapped to the ticks
 * showing, for a mark there (SlotMark); clicking adds a todo then. Hand the handlers to
 * the grid; `dayAt` says which day a spot is on (null where nothing can be added, like the time
 * column of a grid of days). Only for a mouse: a finger scrolls and pinches the timeline, and
 * todos are opened as usual.
 */
export function useSlotHover(
  hourHeight: number,
  dayAt: (target: Element) => DateKey | null,
  onAddAt: ((date: DateKey, time: TimeKey) => void) | undefined,
) {
  const [slot, setSlot] = useState<Slot | null>(null);

  const slotAt = (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>): Slot | null => {
    if (!onAddAt || !(event.target instanceof Element)) return null;
    // A todo opens its details instead.
    if (event.target.closest("button")) return null;
    const date = dayAt(event.target);
    if (!date) return null;
    const step = snapMinutes(hourHeight);
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const minutes = Math.round((((y - GRID_TOP) / hourHeight) * 60) / step) * step;
    return { date, minutes: clamp(minutes, 0, 24 * 60 - step) };
  };

  const same = (a: Slot | null, b: Slot | null) =>
    a === b || (a !== null && b !== null && a.date === b.date && a.minutes === b.minutes);

  return {
    slot,
    /** For the scrolling element: the line would be left behind, so it goes until the next move. */
    hide: useCallback(() => setSlot(null), []),
    handlers: {
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "mouse") return;
        const next = slotAt(event);
        setSlot((current) => (same(current, next) ? current : next));
      },
      onPointerLeave: () => setSlot(null),
      onClick: (event: MouseEvent<HTMLElement>) => {
        const picked = slotAt(event);
        if (!picked || !onAddAt) return;
        setSlot(null);
        onAddAt(picked.date, toTimeKey(picked.minutes));
      },
    },
  };
}

/** How long the orange mark is: longer than the half-hour ticks, so it stands out from them. */
const SLOT_MARK_WIDTH = 20;

/**
 * Where the mouse would add a todo: a short orange line in the time column, at the right edge
 * where the ticks are, on the snapped time. Nothing is drawn over the todos.
 */
export function SlotMark({ minutes, hourHeight }: { minutes: number; hourHeight: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute z-10 h-0.5 rounded-full bg-primary"
      style={{
        left: GUTTER_WIDTH - SLOT_MARK_WIDTH,
        width: SLOT_MARK_WIDTH,
        top: offsetOf(minutes, hourHeight) - 1,
      }}
    />
  );
}

/**
 * The ticks between the hour labels (half and quarter hours, then every five minutes), at the
 * right edge of the time column where the hour lines start, each fading in as zooming in gives
 * the hours room for it, and out again when zooming out. Ticks that are fully faded out aren't
 * drawn.
 */
export const SubHourLines = memo(function SubHourLines({ hourHeight }: { hourHeight: number }) {
  return SUB_HOUR_TICKS.map(({ minutes, width, fadeFrom, fadeTo, opacity }) => {
    const shown = clamp((hourHeight - fadeFrom) / (fadeTo - fadeFrom), 0, 1) * opacity;
    if (shown === 0) return null;
    return HOURS.map((hour) =>
      minutes.map((minute) => (
        <span
          key={`${hour}:${minute}`}
          aria-hidden="true"
          className="absolute h-px bg-line"
          style={{
            left: GUTTER_WIDTH - width,
            width,
            top: offsetOf(hour * 60 + minute, hourHeight),
            opacity: shown,
          }}
        />
      )),
    );
  });
});

/** One todo: a box tinted by priority with its title in full. Done todos are gray. */
export function TimelineChip({
  todo,
  onOpen,
  onMeasure,
  showTime = false,
  fill = false,
  stacked = false,
  handleSpace = false,
}: {
  todo: Todo;
  onOpen: (todo: Todo) => void;
  onMeasure?: (id: string, height: number) => void;
  showTime?: boolean;
  fill?: boolean;
  /** The time under the title, for a narrow column. */
  stacked?: boolean;
  /** Room on the right for the drag handle drawn over it. */
  handleSpace?: boolean;
}) {
  const priority = priorityOf(todo.priority);
  const time = showTime && todo.dueTime ? formatTime(todo.dueTime) : null;
  const content = useRef<HTMLSpanElement>(null);
  const { id } = todo;

  // A block is never shorter than its title, which wraps differently at each width.
  useEffect(() => {
    const element = content.current;
    if (!element || !onMeasure) return;
    const observer = new ResizeObserver(() => onMeasure(id, element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, onMeasure]);

  return (
    <button
      type="button"
      onClick={() => onOpen(todo)}
      aria-label={`${todo.title}${time ? `, ${time}` : ""}, ${priority.label} priority${
        todo.completed ? ", done" : ""
      }. Open details`}
      className={`flex w-full shrink-0 cursor-pointer flex-col rounded-md text-left transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
        fill ? "h-full" : ""
      } ${todo.completed ? "bg-field" : priority.card}`}
    >
      <span
        ref={content}
        className={`flex w-full py-[5px] pl-2 ${handleSpace ? "pr-6" : "pr-2"} ${
          stacked ? "flex-col" : "items-start gap-2"
        }`}
      >
        <span
          className={`min-w-0 flex-1 text-sm leading-[18px] font-semibold wrap-break-word ${
            todo.completed ? "text-subtle line-through" : priority.title
          }`}
        >
          {todo.title}
        </span>
        {time ? (
          <span
            className={`shrink-0 text-xs leading-[18px] ${
              todo.completed ? "text-muted" : priority.title
            }`}
          >
            {time}
          </span>
        ) : null}
      </span>
    </button>
  );
}
