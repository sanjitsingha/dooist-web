"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

import { SIDEBAR_ATTRIBUTE, SIDEBAR_COLLAPSED, SIDEBAR_KEY } from "@/lib/sidebar";

const listeners = new Set<() => void>();
let remembered: boolean | null = null;

function read(): boolean {
  if (remembered === null) {
    try {
      remembered = localStorage.getItem(SIDEBAR_KEY) === SIDEBAR_COLLAPSED;
    } catch {
      remembered = false;
    }
  }
  return remembered;
}

function applyToPage(collapsed: boolean) {
  if (collapsed) document.documentElement.setAttribute(SIDEBAR_ATTRIBUTE, SIDEBAR_COLLAPSED);
  else document.documentElement.removeAttribute(SIDEBAR_ATTRIBUTE);
}

function change(collapsed: boolean) {
  remembered = collapsed;
  applyToPage(collapsed);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_KEY) change(event.newValue === SIDEBAR_COLLAPSED);
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether the side nav is collapsed to icons, remembered in this browser. */
export function useSidebar() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  // React's development remount clears the attribute the first-paint script set on <html>.
  useLayoutEffect(() => applyToPage(read()), []);

  const toggle = useCallback(() => {
    const next = !read();
    try {
      if (next) localStorage.setItem(SIDEBAR_KEY, SIDEBAR_COLLAPSED);
      else localStorage.removeItem(SIDEBAR_KEY);
    } catch {
      // Private browsing can refuse storage. It still works until the page is reloaded.
    }
    change(next);
  }, []);

  return { collapsed, toggle };
}
