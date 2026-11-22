/** Date helpers, matching the Android app's src/lib/dates.ts so both apps read the same. */

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** A calendar day in local time, e.g. "2026-11-11", so a due date never shifts with time zones. */
export type DateKey = string;
/** A time of day, 24-hour "HH:mm". */
export type TimeKey = string;
export type DueDateKind = "today" | "tomorrow" | "weekend" | "nextWeek";

export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shortWeekday(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

function relativeDayLabel(key: DateKey, now: Date): string | null {
  if (key === toDateKey(now)) return "Today";
  if (key === toDateKey(addDays(now, 1))) return "Tomorrow";
  if (key === toDateKey(addDays(now, -1))) return "Yesterday";
  return null;
}

function absoluteDayLabel(key: DateKey, now: Date): string {
  const date = fromDateKey(key);
  const label = `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/** For use inside a sentence: "today", "tomorrow", or e.g. "on Wed, 12 Nov". */
export function formatDayPhrase(key: DateKey, now: Date): string {
  return relativeDayLabel(key, now)?.toLowerCase() ?? `on ${absoluteDayLabel(key, now)}`;
}

/** The month in full and the year's last two digits, e.g. { month: "November", year: "26" }. */
export function headerMonth(key: DateKey): { month: string; year: string } {
  const date = fromDateKey(key);
  return {
    month: MONTHS_LONG[date.getMonth()],
    year: String(date.getFullYear() % 100).padStart(2, "0"),
  };
}

/** "Thursday, 12 November 2026", for screen readers. */
export function formatLongDate(key: DateKey): string {
  const date = fromDateKey(key);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function isOverdue(key: DateKey, now: Date): boolean {
  return key < toDateKey(now);
}

function thisWeekend(now: Date): Date {
  const day = now.getDay();
  return day === 0 || day === 6 ? now : addDays(now, 6 - day);
}

function nextWeek(now: Date): Date {
  return addDays(now, (8 - now.getDay()) % 7 || 7);
}

/** Which quick due-date group `key` falls in, or null for a past day or one further out. */
export function getDueDateKind(key: DateKey, now: Date): DueDateKind | null {
  if (key === toDateKey(now)) return "today";
  if (key === toDateKey(addDays(now, 1))) return "tomorrow";

  const saturday = thisWeekend(now);
  if (key === toDateKey(saturday) || key === toDateKey(addDays(saturday, 1))) return "weekend";

  const monday = nextWeek(now);
  if (key >= toDateKey(monday) && key <= toDateKey(addDays(monday, 6))) return "nextWeek";

  return null;
}

/** "4:12 pm" */
export function formatTime(key: TimeKey): string {
  const [hours, minutes] = key.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`;
}

/** Minutes since midnight: "16:12" is 972. */
export function toDayMinutes(key: TimeKey): number {
  const [hours, minutes] = key.split(":").map(Number);
  return hours * 60 + minutes;
}

/** "Today, 4:12 pm", or just "Today" when there's no time. */
export function formatDueDateTime(key: DateKey, time: TimeKey | undefined, now: Date): string {
  const day = relativeDayLabel(key, now) ?? absoluteDayLabel(key, now);
  return time ? `${day}, ${formatTime(time)}` : day;
}

/** "Wed, 12 Nov" (year added if not this year), never "Today" or "Tomorrow". */
export function formatShortDate(key: DateKey, now: Date): string {
  return absoluteDayLabel(key, now);
}

/** "21 Nov · Today · Saturday", with the year if it isn't this year. */
export function formatActivityDay(key: DateKey, now: Date): string {
  const date = fromDateKey(key);
  const year = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  const relative = relativeDayLabel(key, now);
  return [
    `${date.getDate()} ${MONTHS[date.getMonth()]}${year}`,
    ...(relative ? [relative] : []),
    WEEKDAYS_LONG[date.getDay()],
  ].join(" · ");
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

/** The 1st of the month `months` away. */
export function addMonths(key: DateKey, months: number): DateKey {
  const date = fromDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** "November 2026" */
export function formatMonthYear(key: DateKey): string {
  const date = fromDateKey(key);
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** "23 Nov". */
export function formatDayMonth(key: DateKey): string {
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "23 – 28 Nov 2026", "29 Nov – 4 Dec 2026", or "28 Dec 2026 – 2 Jan 2027". */
export function formatDayRange(from: DateKey, to: DateKey): string {
  const start = fromDateKey(from);
  const end = fromDateKey(to);
  const last = `${formatDayMonth(to)} ${end.getFullYear()}`;
  if (from === to) return last;
  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatDayMonth(from)} ${start.getFullYear()} – ${last}`;
  }
  if (start.getMonth() !== end.getMonth()) return `${formatDayMonth(from)} – ${last}`;
  return `${start.getDate()} – ${last}`;
}

/** A month as six weeks, Sunday first, with null for the cells outside it. */
export function getMonthGrid(key: DateKey): (DateKey | null)[][] {
  const first = fromDateKey(startOfMonth(key));
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = first.getDay();

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - offset + 1;
      return day >= 1 && day <= daysInMonth ? toDateKey(new Date(year, month, day)) : null;
    }),
  );
}

export const MINUTES_PER_DAY = 24 * 60;

/** Where a time picker starts: the current time, to the minute. */
export function currentTime(now: Date): TimeKey {
  return fromDayMinutes(now.getHours() * 60 + now.getMinutes());
}

/** The other way round from toDayMinutes: 972 is "16:12". */
export function fromDayMinutes(total: number): TimeKey {
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  return `${hours}:${String(total % 60).padStart(2, "0")}`;
}

/** The first minute a reminder can be set for on a day. MINUTES_PER_DAY means none are left. */
export function earliestReminderMinute(dueDate: DateKey, now: Date): number {
  const today = toDateKey(now);
  if (dueDate > today) return 0;
  if (dueDate < today) return MINUTES_PER_DAY;
  return now.getHours() * 60 + now.getMinutes() + 1;
}

/** "45 min", "1 hr", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
