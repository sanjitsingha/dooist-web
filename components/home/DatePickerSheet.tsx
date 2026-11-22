"use client";

import { CalendarCheck, Sun } from "lucide-react";
import { useState } from "react";

import { MonthCalendar } from "@/components/home/MonthCalendar";
import { Sheet } from "@/components/home/Sheet";
import { TimeSelector } from "@/components/home/TimeSelector";
import {
  addDays,
  formatLongDate,
  formatShortDate,
  fromDateKey,
  startOfMonth,
  toDateKey,
  type DateKey,
  type TimeKey,
} from "@/lib/dates";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink";

/**
 * The due date modal, like the Android sheet: quick choices, a month, and an optional time under
 * it. Nothing changes on the todo until Done. Past days are off.
 */
export function DatePickerSheet({
  value,
  time,
  today,
  onSave,
  onClose,
}: {
  value: DateKey;
  time: TimeKey;
  today: DateKey;
  onSave: (date: DateKey, time: TimeKey) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(value);
  const [pickedTime, setPickedTime] = useState(time);
  // An overdue todo's date is in the past, so the calendar opens on this month instead.
  const [month, setMonth] = useState(() => startOfMonth(value < today ? today : value));
  const now = fromDateKey(today);
  const choices = [
    { label: "Today", icon: CalendarCheck, color: "text-primary", day: today },
    { label: "Tomorrow", icon: Sun, color: "text-sun-dark", day: toDateKey(addDays(now, 1)) },
  ];

  return (
    <Sheet label="Due date" onRequestClose={onClose}>
      <h2 className="min-h-9 pr-10 text-xl leading-9 font-bold text-text">Due date</h2>

      <div className="mt-2">
        {choices.map(({ label, icon: Icon, color, day }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setDate(day);
              setMonth(startOfMonth(day));
            }}
            aria-pressed={date === day}
            aria-label={`${label}, ${formatLongDate(day)}`}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-3.5 rounded-xl px-2 text-left transition-colors hover:bg-field ${
              date === day ? "bg-field" : ""
            } ${FOCUS}`}
          >
            <Icon aria-hidden="true" className={`size-[22px] shrink-0 ${color}`} />
            <span className="flex-1 text-base font-medium text-text">{label}</span>
            <span className="text-sm text-muted">{formatShortDate(day, now)}</span>
          </button>
        ))}
      </div>

      <div aria-hidden="true" className="mx-2 my-2 h-px bg-line" />

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        value={date}
        today={today}
        min={today}
        onSelect={setDate}
      />

      <div aria-hidden="true" className="mx-2 my-2 h-px bg-line" />

      <TimeSelector
        value={pickedTime}
        onChange={setPickedTime}
        onClear={() => setPickedTime("")}
      />

      <button
        type="button"
        onClick={() => onSave(date, pickedTime)}
        className="mt-3 h-12 w-full cursor-pointer rounded-xl bg-primary text-base font-semibold text-white transition-colors hover:bg-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Done
      </button>
    </Sheet>
  );
}
