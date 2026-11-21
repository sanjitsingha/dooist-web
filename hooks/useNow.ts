"use client";

import { useEffect, useState } from "react";

/** The current time, to the minute. Updates as each minute starts and on returning to the tab. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const current = new Date();
    const untilNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());
    // A little late rather than early, so the new minute has surely started.
    const timer = setTimeout(() => setNow(new Date()), untilNextMinute + 50);
    const refresh = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [now]);

  return now;
}
