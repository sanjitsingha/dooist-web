"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { NotificationKind } from "@/lib/notifications";

export type NotificationSettings = Record<NotificationKind, boolean>;

/** What this browser may do. `phone` is left to the Android app. */
export type BrowserPermission = NotificationPermission | "unsupported" | "phone";

const DEFAULTS: NotificationSettings = { reminder: true, due: true, update: true };

const settingsListeners = new Set<() => void>();
const permissionListeners = new Set<() => void>();

function subscribeToSettings(listener: () => void) {
  settingsListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    settingsListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function parseSettings(raw: string): NotificationSettings {
  try {
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) return DEFAULTS;
    const { reminder, due, update } = saved as Partial<NotificationSettings>;
    return {
      reminder: reminder !== false,
      due: due !== false,
      update: update !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Which kinds of notification are on. Kept in this browser, separate from the Android app. */
export function useNotificationSettings(userId: string) {
  const key = `dooist.notifications.settings.${userId}`;
  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribeToSettings, getSnapshot, () => "");
  const settings = useMemo(() => parseSettings(raw), [raw]);

  const setKind = useCallback(
    (kind: NotificationKind, enabled: boolean) => {
      try {
        const current = parseSettings(localStorage.getItem(key) ?? "");
        localStorage.setItem(key, JSON.stringify({ ...current, [kind]: enabled }));
      } catch {
        // Private browsing can refuse this, and then the switch stays as it was.
      }
      settingsListeners.forEach((listener) => listener());
    },
    [key],
  );

  return { settings, setKind };
}

function readPermission(): BrowserPermission {
  if (typeof Notification === "undefined") return "unsupported";
  // Phone browsers can't show a page's notifications directly, and the Android app has its own.
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return "phone";
  return Notification.permission;
}

function subscribeToPermission(listener: () => void) {
  let status: PermissionStatus | undefined;
  let stopped = false;
  permissionListeners.add(listener);
  // A change in the browser's site settings, which can happen while the page stays open.
  window.addEventListener("focus", listener);
  navigator.permissions
    ?.query({ name: "notifications" })
    .then((result) => {
      if (stopped) return;
      status = result;
      result.addEventListener("change", listener);
    })
    .catch(() => {
      // Not every browser can report this. Coming back to the tab still refreshes it.
    });
  return () => {
    stopped = true;
    permissionListeners.delete(listener);
    window.removeEventListener("focus", listener);
    status?.removeEventListener("change", listener);
  };
}

/** Whether this browser may show notifications, and a way to ask. */
export function useNotificationPermission() {
  const permission = useSyncExternalStore<BrowserPermission>(
    subscribeToPermission,
    readPermission,
    () => "default",
  );

  const request = useCallback(async () => {
    try {
      await Notification.requestPermission();
    } finally {
      permissionListeners.forEach((listener) => listener());
    }
  }, []);

  return { permission, request };
}
