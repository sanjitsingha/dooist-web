import { Check, Pencil, Plus, Trash2, Undo2, type LucideIcon } from "lucide-react";

import type { ReportType } from "@/lib/activity";

/** Each action's name, icon and color, shared by the filter and the activity log. */
export const REPORT_TYPES: readonly {
  value: ReportType;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { value: "added", label: "Added Todos", icon: Plus, color: "bg-success" },
  { value: "updated", label: "Updated Todos", icon: Pencil, color: "bg-sky-dark" },
  { value: "completed", label: "Completed Todos", icon: Check, color: "bg-primary" },
  { value: "uncompleted", label: "Uncompleted Todos", icon: Undo2, color: "bg-amber-dark" },
  { value: "deleted", label: "Deleted Todos", icon: Trash2, color: "bg-danger" },
];

/** A small colored circle with the action's icon. */
export function ActionBadge({ type, className = "" }: { type: ReportType; className?: string }) {
  const action = REPORT_TYPES.find(({ value }) => value === type);
  if (!action) return null;
  const { icon: Icon, color } = action;
  return (
    <span
      aria-hidden="true"
      className={`flex size-4 shrink-0 items-center justify-center rounded-full text-on-status ${color} ${className}`}
    >
      <Icon strokeWidth={3.5} className="size-2.5" />
    </span>
  );
}
