"use client";

import { useCallback, useEffect, useState } from "react";

import {
  disconnectGoogleCalendar,
  resyncGoogleCalendar,
  saveCalendarSettings,
  sendTodosToGoogleCalendar,
} from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";

/** Why sending todos stopped by itself. */
export type CalendarProblem = "revoked" | "calendar_deleted";

export type CalendarConnection = {
  connected: boolean;
  email: string | null;
  problem: CalendarProblem | null;
  syncTodos: boolean;
  showEvents: boolean;
  canReadEvents: boolean;
};

/** Sync calls in one go at most, the same as the Android app. The rest go next time. */
const MAX_ROUNDS = 20;
const OFFLINE = "Couldn’t reach the server. Check your internet connection and try again.";
const NEEDS_ANDROID =
  "Turn this on once in the Dooist Android app, so Google can give permission to read your events.";

async function fetchConnection(userId: string): Promise<CalendarConnection> {
  const { data, error } = await createClient()
    .from("calendar_connections")
    .select("connected, google_email, last_error, sync_todos, show_events, can_read_events")
    .eq("user_id", userId)
    .maybeSingle();
  // PGRST205: a project without the calendar table counts as not connected, as on Android.
  if (error && error.code !== "PGRST205") throw error;
  const connected = data?.connected === true;
  const problem = data?.last_error;
  return {
    connected,
    email: connected ? (data?.google_email ?? null) : null,
    problem: !connected && (problem === "revoked" || problem === "calendar_deleted") ? problem : null,
    syncTodos: data?.sync_todos !== false,
    showEvents: connected && data?.show_events === true,
    canReadEvents: connected && data?.can_read_events === true,
  };
}

/** The account's Google Calendar connection and switches, shared with the Android app. */
export function useCalendarConnection(userId: string, whenSaved: () => Promise<void>) {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    () =>
      fetchConnection(userId).then(
        (next) => {
          setConnection(next);
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setFailed(false);
    void load();
  }, [load]);

  /** Sends what's changed, once this browser's own changes have reached the account. */
  const sendTodos = useCallback(async (): Promise<string | null> => {
    try {
      await whenSaved();
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const result = await sendTodosToGoogleCalendar();
        if (result.problem) return result.problem;
        if (!result.connected) {
          await load();
          return "Google Calendar stopped, so your todos weren’t sent.";
        }
        if (!result.more) return null;
      }
      return null;
    } catch {
      return OFFLINE;
    }
  }, [load, whenSaved]);

  /** Each of these gives back what went wrong, or null. */
  const resync = useCallback(async () => {
    try {
      const problem = await resyncGoogleCalendar();
      if (problem) return problem;
    } catch {
      return OFFLINE;
    }
    return sendTodos();
  }, [sendTodos]);

  const disconnect = useCallback(async () => {
    let problem: string | null;
    try {
      problem = await disconnectGoogleCalendar();
    } catch {
      problem = OFFLINE;
    }
    if (!problem) {
      setConnection({
        connected: false,
        email: null,
        problem: null,
        syncTodos: true,
        showEvents: false,
        canReadEvents: false,
      });
    }
    return problem;
  }, []);

  const setTodoSync = useCallback(
    async (enabled: boolean) => {
      setConnection((now) => now && { ...now, syncTodos: enabled });
      let problem: string | null;
      try {
        ({ problem } = await saveCalendarSettings({ syncTodos: enabled }));
      } catch {
        problem = OFFLINE;
      }
      if (problem) {
        setConnection((now) => now && { ...now, syncTodos: !enabled });
        return problem;
      }
      // Back on, everything goes again. A failure here is picked up by the next sync.
      if (enabled) void sendTodos();
      return null;
    },
    [sendTodos],
  );

  const canReadEvents = connection?.canReadEvents === true;
  const setShowEvents = useCallback(
    async (enabled: boolean) => {
      // Google's permission page can only come back to the Android app.
      if (enabled && !canReadEvents) return NEEDS_ANDROID;
      setConnection((now) => now && { ...now, showEvents: enabled });
      try {
        const { problem, needsPermission } = await saveCalendarSettings({ showEvents: enabled });
        if (needsPermission) {
          setConnection((now) => now && { ...now, showEvents: false, canReadEvents: false });
          return NEEDS_ANDROID;
        }
        if (problem) setConnection((now) => now && { ...now, showEvents: !enabled });
        return problem;
      } catch {
        setConnection((now) => now && { ...now, showEvents: !enabled });
        return OFFLINE;
      }
    },
    [canReadEvents],
  );

  return { connection, failed, retry, resync, disconnect, setTodoSync, setShowEvents };
}
