"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useNow } from "@/hooks/useNow";
import { buildNotifications, type AppUpdate } from "@/lib/notifications";
import type { Todo } from "@/lib/todos";

const NONE_READ = "[]";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Reading one in another tab shows here too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parseIds(raw: string): Set<string> {
  try {
    const ids: unknown = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/** The version this browser last saw. `at` is empty for the first one, which isn't news. */
function parseVersion(raw: string): { version: string; at: number | null } | null {
  try {
    const saved = JSON.parse(raw) as { version?: unknown; at?: unknown } | null;
    if (typeof saved?.version !== "string") return null;
    return { version: saved.version, at: typeof saved.at === "number" ? saved.at : null };
  } catch {
    return null;
  }
}

/**
 * The account's notifications, and which are read, leaving out the kinds turned off in Settings.
 * Read marks are kept in this browser.
 */
export function useNotifications(userId: string, todos: readonly Todo[], version: string) {
  const now = useNow();
  const { settings } = useNotificationSettings(userId);
  const storageKey = `dooist.notifications.read.${userId}`;
  const versionKey = `dooist.notifications.version.${userId}`;

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(storageKey) ?? NONE_READ;
    } catch {
      return NONE_READ;
    }
  }, [storageKey]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => NONE_READ);

  const getVersion = useCallback(() => {
    try {
      return localStorage.getItem(versionKey) ?? "";
    } catch {
      return "";
    }
  }, [versionKey]);
  const rawVersion = useSyncExternalStore(subscribe, getVersion, () => "");

  useEffect(() => {
    try {
      const saved = parseVersion(localStorage.getItem(versionKey) ?? "");
      if (saved?.version === version) return;
      localStorage.setItem(versionKey, JSON.stringify({ version, at: saved ? Date.now() : null }));
    } catch {
      return;
    }
    listeners.forEach((listener) => listener());
  }, [version, versionKey]);

  const update = useMemo<AppUpdate | null>(() => {
    const saved = parseVersion(rawVersion);
    return saved?.at && saved.version === version ? { version, at: saved.at } : null;
  }, [rawVersion, version]);

  const all = useMemo(() => {
    const readIds = parseIds(raw);
    return buildNotifications(todos, now, update).map((notification) => ({
      ...notification,
      read: readIds.has(notification.id),
    }));
  }, [raw, todos, now, update]);

  const notifications = useMemo(
    () => all.filter((notification) => settings[notification.kind]),
    [all, settings],
  );

  /** Saves only ids still on the list, so the saved marks can't grow forever. */
  const save = useCallback(
    (isRead: (id: string, wasRead: boolean) => boolean) => {
      const ids = all
        .filter((notification) => isRead(notification.id, notification.read))
        .map((notification) => notification.id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        // Private browsing can refuse this. The list still works until the page reloads.
      }
      listeners.forEach((listener) => listener());
    },
    [all, storageKey],
  );

  const markRead = useCallback(
    (id: string) => save((candidate, wasRead) => wasRead || candidate === id),
    [save],
  );
  // A kind that's turned off keeps its own read marks for when it comes back on.
  const markAllRead = useCallback(() => {
    const visible = new Set(notifications.map((notification) => notification.id));
    save((id, wasRead) => wasRead || visible.has(id));
  }, [notifications, save]);
  const unread = notifications.filter((notification) => !notification.read).length;

  return { notifications, unread, now, markRead, markAllRead };
}
