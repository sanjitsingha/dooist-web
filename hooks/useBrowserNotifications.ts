"use client";

import { useEffect, useRef } from "react";

import { useNotificationPermission } from "@/hooks/useNotificationSettings";
import { isTimeForPopUp, type AppNotification } from "@/lib/notifications";

/** Longer than anything stays on the notification list, so nothing pops up twice. */
const REMEMBER_MS = 8 * 24 * 60 * 60 * 1000;

function readShown(key: string, now: number): Record<string, number> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (typeof saved !== "object" || saved === null) return {};
    return Object.fromEntries(
      Object.entries(saved).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && now - entry[1] < REMEMBER_MS,
      ),
    );
  } catch {
    return {};
  }
}

/**
 * Shows new notifications as browser pop-ups while Dooist is open in a tab. The tag stops two open
 * tabs from showing the same one twice. Clicking one comes back to Dooist.
 */
export function useBrowserNotifications(
  userId: string,
  notifications: readonly (AppNotification & { read: boolean })[],
  now: Date,
  onOpen: () => void,
) {
  const { permission } = useNotificationPermission();
  // Browsers can drop a click handler once nothing refers to its notification.
  const showing = useRef(new Set<Notification>());

  useEffect(() => {
    if (permission !== "granted") return;
    const key = `dooist.notifications.shown.${userId}`;
    const time = Date.now();
    const shown = readShown(key, time);
    const next = notifications.filter(
      (notification) =>
        !notification.read && !(notification.id in shown) && isTimeForPopUp(notification, now),
    );
    if (next.length === 0) return;

    for (const { id } of next) shown[id] = time;
    try {
      localStorage.setItem(key, JSON.stringify(shown));
    } catch {
      // Private browsing can refuse this. The tag still stops repeats while it's on screen.
    }

    const open = showing.current;
    for (const { id, title, body } of next) {
      try {
        const popUp = new Notification(title, { body, tag: id, icon: "/dooist-icon.png" });
        open.add(popUp);
        popUp.onclose = () => open.delete(popUp);
        popUp.onclick = () => {
          window.focus();
          popUp.close();
          onOpen();
        };
      } catch {
        // The bell's list still has it.
      }
    }
  }, [permission, userId, notifications, now, onOpen]);
}
