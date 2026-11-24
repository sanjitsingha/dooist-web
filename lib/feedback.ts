import {
  Bug,
  CalendarDays,
  CircleUserRound,
  Lightbulb,
  ListTodo,
  MessageCircleMore,
  Palette,
  type LucideIcon,
} from "lucide-react";

import type { FeedbackSubject } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

/**
 * What feedback can be about: the Android app's Subject sheet (src/constants/feedback.ts there),
 * in the same order with the same icons. The values are what's saved; the `feedback` table only
 * takes these.
 */
export const FEEDBACK_SUBJECTS: readonly {
  value: FeedbackSubject;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "bug", label: "Something isn’t working", icon: Bug },
  { value: "idea", label: "Feature idea", icon: Lightbulb },
  { value: "todos", label: "Todos & reminders", icon: ListTodo },
  { value: "calendar", label: "Google Calendar", icon: CalendarDays },
  { value: "account", label: "Account & sign-in", icon: CircleUserRound },
  { value: "design", label: "Look & feel", icon: Palette },
  { value: "other", label: "Something else", icon: MessageCircleMore },
];

/** Longest message it takes (the table allows the same). */
export const MAX_FEEDBACK_LENGTH = 2000;

const OFFLINE = "Couldn’t reach the server. Check your internet connection and try again.";

/**
 * Saves feedback to the account's project, with the web app's version, marked as from the web.
 * Gives back null once it's sent, or what went wrong, ready to show.
 */
export async function sendFeedback(
  subject: FeedbackSubject,
  message: string,
  version: string,
): Promise<string | null> {
  try {
    const { error } = await createClient()
      .from("feedback")
      .insert({
        subject,
        message: message.trim(),
        app_version: version.slice(0, 40),
        platform: "web",
      });
    if (!error) return null;
    // A request that never reached the server comes back with no Postgres code.
    return error.code ? "Couldn’t send your feedback. Please try again later." : OFFLINE;
  } catch {
    return OFFLINE;
  }
}
