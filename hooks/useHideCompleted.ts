"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "dooist.hideCompleted";
const listeners = new Set<() => void>();
let remembered: boolean | null = null;

function read(): boolean {
  if (remembered === null) {
    try {
      remembered = localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      remembered = false;
    }
  }
  return remembered;
}

function change(hidden: boolean) {
  remembered = hidden;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) change(event.newValue === "true");
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether Today leaves out the todos already done. Off until it's turned on, in this browser. */
export function useHideCompleted() {
  const hideCompleted = useSyncExternalStore(subscribe, read, () => false);

  const setHideCompleted = useCallback((hidden: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hidden));
    } catch {
      // Private browsing can refuse storage. It still works until the page is reloaded.
    }
    change(hidden);
  }, []);

  return { hideCompleted, setHideCompleted };
}
