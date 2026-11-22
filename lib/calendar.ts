"use server";

import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const FAILED = "Something went wrong. Please try again.";
const SIGNED_OUT = "You’ve been signed out. Log in again and try once more.";
const OFFLINE = "Couldn’t reach the server. Check your internet connection and try again.";
const NOT_SET_UP = "Google Calendar isn’t set up yet.";

type CalendarReply = { error?: string; connected?: boolean; more?: boolean };

/**
 * Calls the google-calendar Edge Function the Android app uses. It runs on the server because that
 * function doesn't accept calls from browsers.
 */
async function callCalendar(
  body: Record<string, unknown>,
): Promise<{ problem: string | null; reply: CalendarReply | null }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return { problem: SIGNED_OUT, reply: null };

    const { data: reply, error } = await supabase.functions.invoke<CalendarReply>(
      "google-calendar",
      { body },
    );
    if (!error) return { problem: null, reply };
    if (error instanceof FunctionsFetchError) return { problem: OFFLINE, reply: null };
    if (error instanceof FunctionsHttpError) {
      if (error.context.status === 401) return { problem: SIGNED_OUT, reply: null };
      if (error.context.status === 404) return { problem: NOT_SET_UP, reply: null };
    }
    return { problem: FAILED, reply: null };
  } catch {
    return { problem: FAILED, reply: null };
  }
}

/** Stops sending todos to Google and hands the access back. The Dooist calendar stays there. */
export async function disconnectGoogleCalendar(): Promise<string | null> {
  return (await callCalendar({ action: "disconnect" })).problem;
}

/** Marks every todo to be sent again. `sendTodosToGoogleCalendar` does the sending. */
export async function resyncGoogleCalendar(): Promise<string | null> {
  return (await callCalendar({ action: "resync" })).problem;
}

/** Sends one batch of changed todos. `more` says to call again. */
export async function sendTodosToGoogleCalendar(): Promise<{
  problem: string | null;
  connected: boolean;
  more: boolean;
}> {
  const { problem, reply } = await callCalendar({ action: "sync" });
  return { problem, connected: reply?.connected === true, more: reply?.more === true };
}

/** Saves the Calendar section's switches. */
export async function saveCalendarSettings(changes: {
  syncTodos?: boolean;
  showEvents?: boolean;
}): Promise<{ problem: string | null; needsPermission: boolean }> {
  const body: Record<string, unknown> = { action: "settings" };
  if (typeof changes?.syncTodos === "boolean") body.syncTodos = changes.syncTodos;
  if (typeof changes?.showEvents === "boolean") body.showEvents = changes.showEvents;

  const { problem, reply } = await callCalendar(body);
  if (problem) return { problem, needsPermission: false };
  if (reply?.error === "needs_permission") return { problem: null, needsPermission: true };
  return { problem: reply?.error ? FAILED : null, needsPermission: false };
}
