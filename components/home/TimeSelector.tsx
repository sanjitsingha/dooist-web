"use client";

import { Clock, X } from "lucide-react";

import { MINUTES_PER_DAY, fromDayMinutes, toDayMinutes, type TimeKey } from "@/lib/dates";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink";

const pad = (value: number) => String(value).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

type Option = { value: string; label: string; disabled: boolean };

/** Minutes since midnight for an hour on the 12-hour clock, minutes and AM or PM. */
const dayMinutes = (hour12: number, minutes: number, isPm: boolean) =>
  ((hour12 % 12) + (isPm ? 12 : 0)) * 60 + minutes;

function TimeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`short-list h-9 w-[66px] cursor-pointer justify-between rounded-lg border border-line bg-surface pr-1.5 pl-2.5 text-sm font-medium text-text tabular-nums transition-colors hover:bg-canvas ${FOCUS}`}
    >
      <option value="" hidden>
        --
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * The time control for a due time and a reminder: hour, minute and AM or PM. The first one picked
 * fills in the others. With `earliest`, in minutes since midnight, times before it are off.
 */
export function TimeSelector({
  value,
  earliest = 0,
  onChange,
  onClear,
}: {
  value: TimeKey | "";
  earliest?: number;
  onChange: (time: TimeKey) => void;
  /** Shows a button to remove the time. */
  onClear?: () => void;
}) {
  const total = value ? toDayMinutes(value) : null;
  const hour = total === null ? null : Math.floor(total / 60) % 12 || 12;
  const minute = total === null ? null : total % 60;
  const isPm = total === null ? null : total >= 12 * 60;

  const change = (next: { hour?: number; minute?: number; isPm?: boolean }) => {
    const now = new Date();
    const nextHour = next.hour ?? hour ?? (now.getHours() % 12 || 12);
    // Picking the hour first means on the hour.
    const nextMinute = next.minute ?? minute ?? (next.hour !== undefined ? 0 : now.getMinutes());
    let nextIsPm = next.isPm ?? isPm ?? now.getHours() >= 12;
    // A first pick that has already passed this morning means this afternoon.
    if (
      isPm === null &&
      next.isPm === undefined &&
      dayMinutes(nextHour, nextMinute, nextIsPm) < earliest
    ) {
      nextIsPm = true;
    }
    const picked = Math.max(dayMinutes(nextHour, nextMinute, nextIsPm), earliest);
    if (picked < MINUTES_PER_DAY) onChange(fromDayMinutes(picked));
  };

  const hourOptions = HOURS.map((option) => ({
    value: String(option),
    label: pad(option),
    // With nothing picked yet, an hour is still open if its afternoon is.
    disabled: dayMinutes(option, 59, isPm ?? true) < earliest,
  }));
  const minuteOptions = MINUTES.map((option) => ({
    value: String(option),
    label: pad(option),
    disabled: hour !== null && dayMinutes(hour, option, isPm ?? false) < earliest,
  }));
  const periodOptions = [
    { value: "am", label: "AM", disabled: dayMinutes(11, 59, false) < earliest },
    { value: "pm", label: "PM", disabled: dayMinutes(11, 59, true) < earliest },
  ];

  return (
    <div className="flex min-h-11 items-center gap-1.5 px-2">
      <Clock aria-hidden="true" className="size-5 shrink-0 text-ink" />
      <span className="mr-auto pl-1 text-base text-text">Time</span>
      <TimeSelect
        label="Hour"
        value={hour === null ? "" : String(hour)}
        options={hourOptions}
        onChange={(next) => change({ hour: Number(next) })}
      />
      <span aria-hidden="true" className="font-semibold text-muted">
        :
      </span>
      <TimeSelect
        label="Minute"
        value={minute === null ? "" : String(minute)}
        options={minuteOptions}
        onChange={(next) => change({ minute: Number(next) })}
      />
      <TimeSelect
        label="AM or PM"
        value={isPm === null ? "" : isPm ? "pm" : "am"}
        options={periodOptions}
        onChange={(next) => change({ isPm: next === "pm" })}
      />
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove time"
          className={`-mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-ink ${FOCUS} ${
            value ? "" : "invisible"
          }`}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
