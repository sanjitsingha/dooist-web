"use client";

import { useCallback, useSyncExternalStore } from "react";

export type UpcomingView = "list" | "grid";

const STORAGE_KEY = "dooist.upcomingView";
const listeners = new Set<() => void>();
let remembered: UpcomingView | null = null;

const parse = (value: string | null): UpcomingView => (value === "grid" ? "grid" : "list");

function read(): UpcomingView {
  if (remembered === null) {
    try {
      remembered = parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      remembered = "list";
    }
  }
  return remembered;
}

function change(view: UpcomingView) {
  remembered = view;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) change(parse(event.newValue));
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The Upcoming page's list or day-by-day calendar, remembered in this browser. */
export function useUpcomingView() {
  const view = useSyncExternalStore(subscribe, read, () => "list" as const);

  const toggle = useCallback(() => {
    const next = read() === "grid" ? "list" : "grid";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can refuse storage. It still works until the page is reloaded.
    }
    change(next);
  }, []);

  return { view, toggle };
}
