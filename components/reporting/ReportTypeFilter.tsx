"use client";

import { Check } from "lucide-react";

import { ActionBadge, REPORT_TYPES } from "@/components/reporting/ActionBadge";
import { FilterDropdown } from "@/components/reporting/FilterDropdown";
import type { ReportType } from "@/lib/activity";

function Option({
  type,
  label,
  checked,
  onChange,
}: {
  type: ReportType;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="relative flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-medium whitespace-nowrap transition-colors hover:bg-field has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="flex size-3.5 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-subtle bg-surface text-white transition-colors peer-checked:border-primary peer-checked:bg-primary"
      >
        {checked ? <Check strokeWidth={3.5} className="size-2.5" /> : null}
      </span>
      <ActionBadge type={type} className="ml-0.5" />
      {label}
    </label>
  );
}

/** Which actions to report on: a dropdown of checkboxes. Nothing ticked means all of them. */
export function ReportTypeFilter({
  selected,
  onChange,
}: {
  selected: readonly ReportType[];
  onChange: (selected: readonly ReportType[]) => void;
}) {
  const summary =
    selected.length === 0 || selected.length === REPORT_TYPES.length
      ? "All Actions"
      : selected.length === 1
        ? REPORT_TYPES.find((type) => type.value === selected[0])?.label
        : `${selected.length} selected`;

  const toggle = (type: ReportType) =>
    onChange(
      selected.includes(type) ? selected.filter((value) => value !== type) : [...selected, type],
    );

  return (
    <FilterDropdown label="Actions to report on" summary={summary} widthClass="w-48">
      {() =>
        REPORT_TYPES.map(({ value, label }) => (
          <Option
            key={value}
            type={value}
            label={label}
            checked={selected.includes(value)}
            onChange={() => toggle(value)}
          />
        ))
      }
    </FilterDropdown>
  );
}
