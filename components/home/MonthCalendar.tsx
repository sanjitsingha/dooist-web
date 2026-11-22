"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  WEEKDAYS,
  addMonths,
  formatLongDate,
  formatMonthYear,
  getMonthGrid,
  startOfMonth,
  type DateKey,
} from "@/lib/dates";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink";

function Day({
  day,
  selected,
  isToday,
  disabled,
  compact,
  onSelect,
}: {
  day: DateKey;
  selected: boolean;
  isToday: boolean;
  disabled: boolean;
  compact: boolean;
  onSelect: (day: DateKey) => void;
}) {
  const look = selected
    ? "bg-primary font-bold text-white enabled:hover:bg-primary-pressed"
    : disabled
      ? "font-medium text-subtle/50"
      : isToday
        ? "font-bold text-primary hover:bg-field"
        : "font-medium text-text hover:bg-field";

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      disabled={disabled}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${formatLongDate(day)}${isToday ? ", today" : ""}`}
      className={`relative mx-auto flex cursor-pointer items-center justify-center transition-colors disabled:cursor-default ${
        compact ? "size-7 rounded-md text-xs" : "size-9 rounded-lg text-[15px]"
      } ${look} ${FOCUS}`}
    >
      {Number(day.slice(8))}
      {isToday ? (
        <span
          aria-hidden="true"
          className={`absolute rounded-full ${compact ? "bottom-0.5 size-[3px]" : "bottom-1 size-1"} ${
            selected ? "bg-white" : "bg-primary"
          }`}
        />
      ) : null}
    </button>
  );
}

/** A month of days with previous and next buttons. Always six weeks, so its size never changes. */
export function MonthCalendar({
  month,
  onMonthChange,
  value,
  today,
  min,
  compact = false,
  onSelect,
}: {
  /** The 1st of the month on screen. */
  month: DateKey;
  onMonthChange: (month: DateKey) => void;
  value: DateKey | null;
  today: DateKey;
  /** Days before this are off. */
  min?: DateKey;
  /** Smaller, for a dropdown. */
  compact?: boolean;
  onSelect: (day: DateKey) => void;
}) {
  const monthButton = `flex cursor-pointer items-center justify-center rounded-lg text-text transition-colors enabled:hover:bg-field disabled:cursor-default disabled:opacity-30 ${
    compact ? "size-7" : "size-9"
  } ${FOCUS}`;
  const arrow = compact ? "size-4" : "size-5";

  return (
    <div>
      <div className={`mb-1 flex items-center justify-between ${compact ? "pl-1.5" : "pl-2"}`}>
        <h3
          aria-live="polite"
          className={compact ? "text-[13px] font-semibold text-text" : "text-[17px] font-bold text-text"}
        >
          {formatMonthYear(month)}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            disabled={min !== undefined && month <= startOfMonth(min)}
            aria-label="Previous month"
            className={monthButton}
          >
            <ChevronLeft aria-hidden="true" className={arrow} />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            aria-label="Next month"
            className={monthButton}
          >
            <ChevronRight aria-hidden="true" className={arrow} />
          </button>
        </div>
      </div>

      <div aria-hidden="true" className="grid grid-cols-7 py-1">
        {WEEKDAYS.map((name) => (
          <span
            key={name}
            className={`text-center font-semibold tracking-wide text-muted uppercase ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            {name}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {getMonthGrid(month)
          .flat()
          .map((day, index) =>
            day ? (
              <Day
                key={day}
                day={day}
                selected={day === value}
                isToday={day === today}
                disabled={min !== undefined && day < min}
                compact={compact}
                onSelect={onSelect}
              />
            ) : (
              <span
                key={`empty-${index}`}
                aria-hidden="true"
                className={compact ? "h-7" : "h-9"}
              />
            ),
          )}
      </div>
    </div>
  );
}
