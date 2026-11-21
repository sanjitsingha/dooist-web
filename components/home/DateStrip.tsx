"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  addDays,
  formatLongDate,
  fromDateKey,
  shortWeekday,
  toDateKey,
  type DateKey,
} from "@/lib/dates";

const VISIBLE_DAYS = 7;
/** Empty cells at each end, so the first and last day can reach the center. */
const SIDE_CELLS = 3;
// The same reach as the Android app's strip.
const DAYS_BEFORE = 365;
const DAYS_AFTER = 365 * 5;
const DAY_COUNT = DAYS_BEFORE + DAYS_AFTER + 1;
const TRACK_CELLS = DAY_COUNT + SIDE_CELLS * 2;
/** Only the days near the center are in the page, so years of days stay light. */
const RENDER_AROUND = 21;
/** Further than this, the strip jumps instead of sliding past every day. */
const SLIDE_DISTANCE = 14;
/** One notch of a mouse wheel is one day. */
const WHEEL_STEP = 100;
const DRAG_THRESHOLD = 4;

const ARROW =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink";

function indexOfDay(key: DateKey, anchor: DateKey): number {
  const difference = fromDateKey(key).getTime() - fromDateKey(anchor).getTime();
  // Rounded, because a day with a clock change isn't exactly 24 hours.
  return Math.round(difference / 86_400_000) + DAYS_BEFORE;
}

const dayAt = (index: number, anchor: DateKey) => addDays(fromDateKey(anchor), index - DAYS_BEFORE);
const clampIndex = (index: number) => Math.min(DAY_COUNT - 1, Math.max(0, index));
const stepOf = (element: HTMLElement) => element.clientWidth / VISIBLE_DAYS;
const readIndex = (element: HTMLElement) =>
  clampIndex(Math.round(element.scrollLeft / stepOf(element)));
const motion = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/**
 * A scrollable week of days with the picked one in the middle, like the Android app's strip. The
 * day that comes to rest in the center is picked.
 */
export function DateStrip({
  today,
  selected,
  onSelect,
}: {
  today: DateKey;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
}) {
  const [savedAnchor, setSavedAnchor] = useState(today);
  // A day past the strip's reach (a far-off due date) recenters the range on that day.
  const index = indexOfDay(selected, savedAnchor);
  const outOfRange = index < 0 || index >= DAY_COUNT;
  if (outOfRange) setSavedAnchor(selected);
  const anchor = outOfRange ? selected : savedAnchor;
  const center = fromDateKey(selected);

  return (
    <div role="group" aria-label="Pick a day" className="mb-4 flex items-center">
      <button
        type="button"
        aria-label="Previous day"
        onClick={() => onSelect(toDateKey(addDays(center, -1)))}
        className={ARROW}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>

      <DayScroller
        key={anchor}
        anchor={anchor}
        today={today}
        selected={selected}
        onSelect={onSelect}
      />

      <button
        type="button"
        aria-label="Next day"
        onClick={() => onSelect(toDateKey(addDays(center, 1)))}
        className={ARROW}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

function DayScroller({
  anchor,
  today,
  selected,
  onSelect,
}: {
  anchor: DateKey;
  today: DateKey;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
}) {
  const selectedIndex = indexOfDay(selected, anchor);
  const scroller = useRef<HTMLDivElement>(null);
  /** The day in the center right now, which moves while scrolling. */
  const [centerIndex, setCenterIndex] = useState(selectedIndex);
  const [lastSelected, setLastSelected] = useState(selectedIndex);
  if (selectedIndex !== lastSelected) {
    setLastSelected(selectedIndex);
    if (Math.abs(selectedIndex - centerIndex) > SLIDE_DISTANCE) setCenterIndex(selectedIndex);
  }

  /** The day the strip last came to rest on, or is on its way to. */
  const atRest = useRef(selectedIndex);
  /** Where a slide started by the app is heading, so a pause on the way doesn't pick a day. */
  const movingTo = useRef<number | null>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const focusAfterMove = useRef(false);
  const latestOnSelect = useRef(onSelect);

  useLayoutEffect(() => {
    latestOnSelect.current = onSelect;
  });

  const settle = useCallback(() => {
    const element = scroller.current;
    if (!element || !element.clientWidth || drag.current?.moved) return;
    const index = readIndex(element);
    if (movingTo.current !== null && index !== movingTo.current) {
      element.scrollTo({ left: movingTo.current * stepOf(element), behavior: motion() });
      return;
    }
    movingTo.current = null;
    element.style.removeProperty("scroll-snap-type");
    setCenterIndex(index);
    if (index !== atRest.current) {
      atRest.current = index;
      latestOnSelect.current(toDateKey(dayAt(index, anchor)));
    }
  }, [anchor]);

  const slideTo = useCallback(
    (index: number, smooth: boolean) => {
      const element = scroller.current;
      if (!element || !element.clientWidth) return;
      const left = index * stepOf(element);
      movingTo.current = index;
      if (Math.abs(element.scrollLeft - left) < 1) {
        requestAnimationFrame(settle);
        return;
      }
      element.scrollTo({ left, behavior: smooth ? motion() : "auto" });
    },
    [settle],
  );

  // On opening, and whenever Next.js shows this page again after hiding it.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = atRest.current * stepOf(element);
  }, []);

  // A day picked from outside the scrolling: a click, an arrow, the Today button, a new todo.
  useLayoutEffect(() => {
    if (selectedIndex !== atRest.current) {
      const distance = Math.abs(selectedIndex - atRest.current);
      atRest.current = selectedIndex;
      slideTo(selectedIndex, distance <= SLIDE_DISTANCE);
    }
    if (focusAfterMove.current) {
      focusAfterMove.current = false;
      scroller.current
        ?.querySelector<HTMLElement>(`[data-day="${selected}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [selected, selectedIndex, slideTo]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const hasScrollEnd = "onscrollend" in window;
    let frame = 0;
    let restTimer: ReturnType<typeof setTimeout> | undefined;
    let wheelTotal = 0;

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (element.clientWidth) setCenterIndex(readIndex(element));
      });
      if (!hasScrollEnd) {
        clearTimeout(restTimer);
        restTimer = setTimeout(settle, 140);
      }
    };

    // An ordinary mouse wheel only scrolls up and down, so here that moves through the days.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        movingTo.current = null;
        return;
      }
      event.preventDefault();
      wheelTotal += event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 33 : event.deltaY;
      const days = Math.trunc(wheelTotal / WHEEL_STEP);
      if (days === 0) return;
      wheelTotal -= days * WHEEL_STEP;
      slideTo(clampIndex((movingTo.current ?? readIndex(element)) + days), true);
    };

    // Keeps the day centered when the window, or the side nav, changes the strip's width.
    const observer = new ResizeObserver(() => {
      if (!element.clientWidth || movingTo.current !== null || drag.current) return;
      element.scrollLeft = atRest.current * stepOf(element);
    });

    element.addEventListener("scroll", onScroll, { passive: true });
    if (hasScrollEnd) element.addEventListener("scrollend", settle);
    element.addEventListener("wheel", onWheel, { passive: false });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(restTimer);
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("scrollend", settle);
      element.removeEventListener("wheel", onWheel);
      observer.disconnect();
    };
  }, [settle, slideTo]);

  // Touch scrolls by itself. A mouse needs dragging added.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    movingTo.current = null;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const distance = event.clientX - current.x;
    if (!current.moved) {
      if (Math.abs(distance) < DRAG_THRESHOLD) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      // Snapping would fight the mouse. It comes back once the strip is at rest.
      event.currentTarget.style.scrollSnapType = "none";
    }
    event.currentTarget.scrollLeft = current.left - distance;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const moved = drag.current?.moved;
    drag.current = null;
    if (moved) slideTo(readIndex(event.currentTarget), true);
  };

  const pick = useCallback(
    (key: DateKey) => latestOnSelect.current(key),
    [],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    focusAfterMove.current = true;
    const change = event.key === "ArrowRight" ? 1 : -1;
    latestOnSelect.current(toDateKey(addDays(fromDateKey(selected), change)));
  };

  const first = Math.max(0, centerIndex - RENDER_AROUND);
  const last = Math.min(DAY_COUNT - 1, centerIndex + RENDER_AROUND);
  const days = [];
  for (let index = first; index <= last; index++) {
    const day = dayAt(index, anchor);
    const key = toDateKey(day);
    days.push(
      <DayItem
        key={key}
        dayKey={key}
        index={index}
        weekday={shortWeekday(day)}
        date={day.getDate()}
        isCentered={index === centerIndex}
        isTabStop={index === selectedIndex}
        isToday={key === today}
        onPick={pick}
      />,
    );
  }

  return (
    <div
      ref={scroller}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="min-w-0 flex-1 cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain select-none [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
    >
      <div
        className="relative h-[62px]"
        style={{ width: `calc(${TRACK_CELLS} * 100% / ${VISIBLE_DAYS})` }}
      >
        {days}
      </div>
    </div>
  );
}

const DayItem = memo(function DayItem({
  dayKey,
  index,
  weekday,
  date,
  isCentered,
  isTabStop,
  isToday,
  onPick,
}: {
  dayKey: DateKey;
  index: number;
  weekday: string;
  date: number;
  isCentered: boolean;
  isTabStop: boolean;
  isToday: boolean;
  onPick: (key: DateKey) => void;
}) {
  return (
    <button
      type="button"
      data-day={dayKey}
      tabIndex={isTabStop ? 0 : -1}
      onClick={() => onPick(dayKey)}
      aria-pressed={isCentered}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${formatLongDate(dayKey)}${isToday ? ", today" : ""}`}
      style={{
        left: `calc(${index + SIDE_CELLS} * 100% / ${TRACK_CELLS})`,
        width: `calc(100% / ${TRACK_CELLS})`,
      }}
      className="group absolute top-0 flex h-full cursor-pointer snap-center flex-col items-center rounded-lg py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      <span
        className={`text-[13px] leading-4 ${isCentered ? "font-bold text-text" : "text-subtle"}`}
      >
        {weekday}
      </span>
      <span
        className={`mt-0.5 flex size-7 items-center justify-center rounded-lg text-[15px] transition-colors ${
          isCentered
            ? "bg-ink-soft font-semibold text-text"
            : isToday
              ? "font-semibold text-primary group-hover:bg-field"
              : "text-muted group-hover:bg-field"
        }`}
      >
        {date}
      </span>
    </button>
  );
});
