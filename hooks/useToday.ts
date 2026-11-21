"use client";

import { useSyncExternalStore } from "react";

import { toDateKey, type DateKey } from "@/lib/dates";

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  window.addEventListener("focus", onChange);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", onChange);
  };
}

const getToday = () => toDateKey(new Date());
const getServerToday = () => null;

/**
 * Today in the browser's time zone, moving on at midnight. Null while rendering on the server,
 * which can't know what day it is for this person.
 */
export function useToday(): DateKey | null {
  return useSyncExternalStore(subscribe, getToday, getServerToday);
}
