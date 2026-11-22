"use client";

import { Bell } from "lucide-react";

import { Sheet } from "@/components/home/Sheet";
import type { useNotifications } from "@/hooks/useNotifications";
import {
  addDays,
  formatShortDate,
  formatTime,
  fromDayMinutes,
  toDateKey,
} from "@/lib/dates";

type Notification = ReturnType<typeof useNotifications>["notifications"][number];

const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

/** Newest first, under Today, Yesterday and Earlier (only the ones with any). */
function sectionsOf(list: readonly Notification[], now: Date) {
  const today = toDateKey(now);
  const yesterday = toDateKey(addDays(now, -1));
  const groups: Record<"Today" | "Yesterday" | "Earlier", Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const notification of list) {
    const day = toDateKey(new Date(notification.at));
    if (day === today) groups.Today.push(notification);
    else if (day === yesterday) groups.Yesterday.push(notification);
    else groups.Earlier.push(notification);
  }
  return (Object.keys(groups) as (keyof typeof groups)[])
    .filter((title) => groups[title].length > 0)
    .map((title) => ({ title, items: groups[title] }));
}

/** "4:12 pm" today, "Yesterday", or the date before that. */
function timeLabel({ at, allDay }: Notification, now: Date): string {
  if (allDay) return "";
  const date = new Date(at);
  const day = toDateKey(date);
  if (day === toDateKey(now)) {
    return formatTime(fromDayMinutes(date.getHours() * 60 + date.getMinutes()));
  }
  if (day === toDateKey(addDays(now, -1))) return "Yesterday";
  return formatShortDate(day, now);
}

function Row({
  notification,
  now,
  onRead,
}: {
  notification: Notification;
  now: Date;
  onRead: (id: string) => void;
}) {
  const unread = !notification.read;
  const time = timeLabel(notification, now);
  return (
    <button
      type="button"
      onClick={() => onRead(notification.id)}
      aria-label={`${unread ? "Unread. " : ""}${notification.title}. ${notification.body}${
        time ? ` ${time}.` : ""
      }`}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-field ${FOCUS}`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-[15px] text-text ${
              unread ? "font-bold" : "font-medium"
            }`}
          >
            {notification.title}
          </span>
          {time ? <span className="shrink-0 text-xs text-subtle">{time}</span> : null}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm leading-[19px] text-muted">
          {notification.body}
        </span>
      </span>
      {/* Keeps its room when read, so the text doesn't shift. */}
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${unread ? "bg-primary" : ""}`}
      />
    </button>
  );
}

/** The Notifications modal, like the Android page. Clicking one marks it read. */
export function NotificationsSheet({
  notifications,
  unread,
  now,
  onRead,
  onReadAll,
  onClose,
}: {
  notifications: readonly Notification[];
  unread: number;
  now: Date;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onClose: () => void;
}) {
  const sections = sectionsOf(notifications, now);

  return (
    <Sheet label="Notifications" fixedHeight onRequestClose={onClose}>
      <div className="flex min-h-9 items-center justify-between gap-2 pr-10">
        <h2 className="text-xl font-bold text-text">Notifications</h2>
        {unread > 0 ? (
          <button
            type="button"
            onClick={onReadAll}
            className={`cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-field ${FOCUS}`}
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <div className="flex h-[calc(88dvh-96px)] flex-col items-center justify-center gap-2 px-6 text-center md:h-[464px]">
          <Bell aria-hidden="true" strokeWidth={1.5} className="mb-1 size-11 text-subtle" />
          <h3 className="text-[17px] font-bold text-text">No notifications yet</h3>
          <p className="text-sm leading-5 text-muted">
            Reminders, todos due today and other news about your day will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-2 max-h-[calc(88dvh-104px)] overflow-y-auto overscroll-contain [scrollbar-width:none] md:max-h-[456px] [&::-webkit-scrollbar]:hidden">
          {sections.map(({ title, items }) => (
            <section key={title} className="pb-2">
              <h3 className="px-2 pt-2 pb-1 text-[13px] font-semibold text-muted">{title}</h3>
              {items.map((notification) => (
                <Row
                  key={notification.id}
                  notification={notification}
                  now={now}
                  onRead={onRead}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}
