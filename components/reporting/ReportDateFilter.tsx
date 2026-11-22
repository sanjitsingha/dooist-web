"use client";

import { CalendarCheck, CalendarDays, CalendarRange, Check } from "lucide-react";
import { useState } from "react";

import { MonthCalendar } from "@/components/home/MonthCalendar";
import { FilterDropdown } from "@/components/reporting/FilterDropdown";
import type { DateChoice } from "@/lib/activity";
import { formatShortDate, fromDateKey, startOfMonth, type DateKey } from "@/lib/dates";

const RANGES = [
  { value: "today", label: "Today", icon: CalendarCheck },
  { value: "week", label: "This week", icon: CalendarRange },
  { value: "month", label: "This month", icon: CalendarDays },
] as const;

const isExactDay = (choice: DateChoice) => choice.includes("-");

/** Which dates to report on. Picking the current choice again goes back to any date. */
export function ReportDateFilter({
  choice,
  today,
  onChange,
}: {
  choice: DateChoice;
  /** Null until the browser has said what day it is. */
  today: DateKey | null;
  onChange: (choice: DateChoice) => void;
}) {
  /** The month being looked at. Null follows the picked day, or today. */
  const [month, setMonth] = useState<DateKey | null>(null);

  const pickedDay = choice === "today" ? today : isExactDay(choice) ? choice : null;
  const summary =
    choice === "any"
      ? "Any date"
      : isExactDay(choice)
        ? today
          ? formatShortDate(choice, fromDateKey(today))
          : choice
        : RANGES.find((range) => range.value === choice)?.label;

  const pick = (next: DateChoice, close: () => void) => {
    onChange(next === choice ? "any" : next);
    close();
  };

  return (
    <FilterDropdown
      label="Date"
      summary={summary}
      widthClass="w-40"
      menuWidth={256}
      onClear={choice === "any" ? undefined : () => onChange("any")}
      onClosed={() => setMonth(null)}
    >
      {(close) =>
        today ? (
          <>
            {RANGES.map(({ value, label, icon: Icon }) => {
              const selected = choice === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pick(value, close)}
                  className={`flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
                    selected ? "bg-field" : ""
                  }`}
                >
                  <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
                  <span className="flex-1">{label}</span>
                  {selected ? (
                    <Check aria-hidden="true" strokeWidth={3} className="size-3 text-primary" />
                  ) : null}
                </button>
              );
            })}

            <div aria-hidden="true" className="my-1 h-px bg-line" />

            <div className="px-1 pb-1">
              <MonthCalendar
                compact
                month={month ?? startOfMonth(pickedDay ?? today)}
                onMonthChange={setMonth}
                value={pickedDay}
                today={today}
                onSelect={(day) => pick(day === today ? "today" : day, close)}
              />
            </div>
          </>
        ) : null
      }
    </FilterDropdown>
  );
}
