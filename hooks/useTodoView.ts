"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TodoView = "list" | "timeline";

const STORAGE_KEY = "dooist.todoView";
const listeners = new Set<() => void>();
let remembered: TodoView | null = null;

function read(): TodoView {
  if (remembered === null) {
    try {
      remembered = localStorage.getItem(STORAGE_KEY) === "timeline" ? "timeline" : "list";
    } catch {
      remembered = "list";
    }
  }
  return remembered;
}

function change(view: TodoView) {
  remembered = view;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) change(event.newValue === "timeline" ? "timeline" : "list");
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** List or timeline, remembered in this browser. */
export function useTodoView() {
  const view = useSyncExternalStore(subscribe, read, () => "list" as const);

  const toggle = useCallback(() => {
    const next = read() === "timeline" ? "list" : "timeline";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can refuse storage. It still works until the page is reloaded.
    }
    change(next);
  }, []);

  return { view, toggle };
}
