"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { avatarInitial } from "@/components/app/AppNav";
import { REPORT_TYPES } from "@/components/reporting/ActionBadge";
import { dateChoiceSummary } from "@/components/reporting/ReportDateFilter";
import type { ActivityEvent, DateChoice, ReportType } from "@/lib/activity";
import { currentTime, formatLongDate, formatTime, toDateKey, type DateKey } from "@/lib/dates";
import { createReportPdf } from "@/lib/reportPdf";
import type { CurrentUser } from "@/lib/session";

/** e.g. "dooist-activity-2026-11-24.pdf", named after the dates it covers. */
function fileName(date: DateChoice, today: DateKey) {
  const dates =
    date === "any"
      ? `all-${today}`
      : date === "today"
        ? today
        : date === "week"
          ? `week-${today}`
          : date === "month"
            ? today.slice(0, 7)
            : date;
  return `dooist-activity-${dates}.pdf`;
}

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers start reading the file only after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Saves what the filters show as a PDF: every row, not only the page on screen. */
export function DownloadReportButton({
  events,
  types,
  date,
  today,
  user,
  disabled,
}: {
  events: readonly ActivityEvent[];
  types: readonly ReportType[];
  date: DateChoice;
  today: DateKey | null;
  user: CurrentUser;
  disabled: boolean;
}) {
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");
  const working = state === "working";

  const download = async () => {
    if (!today) return;
    setState("working");
    const now = new Date();
    const actions =
      types.length === 0 || types.length === REPORT_TYPES.length
        ? "All Actions"
        : REPORT_TYPES.filter(({ value }) => types.includes(value))
            .map(({ label }) => label)
            .join(", ");
    try {
      const pdf = await createReportPdf({
        events,
        today,
        title: "Reporting",
        details: [
          [user.name ?? user.email, actions, dateChoiceSummary(date, today)].join(" · "),
          `Downloaded ${formatLongDate(toDateKey(now))}, ${formatTime(currentTime(now))}`,
        ],
        avatar: { url: user.avatarUrl, initial: avatarInitial(user) },
      });
      saveFile(pdf, fileName(date, today));
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={download}
        disabled={disabled || working}
        aria-label={working ? "Preparing PDF" : "Download PDF"}
        aria-busy={working}
        className="ml-auto flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[13px] font-medium text-text transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default disabled:text-subtle disabled:hover:bg-surface sm:px-2.5"
      >
        {working ? (
          <LoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-muted" />
        ) : (
          <Download aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
        )}
        <span className="hidden sm:inline">{working ? "Preparing…" : "Download PDF"}</span>
      </button>
      {state === "failed" ? (
        <p role="alert" className="w-full text-right text-[13px] text-danger">
          Couldn’t make the PDF. Try again.
        </p>
      ) : null}
    </>
  );
}
