"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  APPEARANCE_KEY,
  applyAppearance,
  isAppearance,
  THEME_ATTRIBUTE,
  type Appearance,
} from "@/lib/theme";

const listeners = new Set<() => void>();
let current: Appearance | null = null;

function readSaved(): Appearance {
  try {
    const saved = localStorage.getItem(APPEARANCE_KEY);
    return isAppearance(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

function getAppearance(): Appearance {
  current ??= readSaved();
  return current;
}

function setLocalAppearance(next: Appearance) {
  current = next;
  try {
    localStorage.setItem(APPEARANCE_KEY, next);
  } catch {
    // Private browsing can block this. The look still changes until the page reloads.
  }
  applyAppearance(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // A change in another tab of this browser.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== APPEARANCE_KEY) return;
    current = readSaved();
    applyAppearance(current);
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeToShownTheme(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  return () => observer.disconnect();
}

/** Whether the dark look is showing now, including when System picked it. */
export function useIsDark() {
  return useSyncExternalStore(
    subscribeToShownTheme,
    () => document.documentElement.getAttribute(THEME_ATTRIBUTE) === "dark",
    () => false,
  );
}

/** The Light, Dark or System choice, kept in this browser and in the account the phone shares. */
export function useAppearance(userId: string) {
  const appearance = useSyncExternalStore(subscribe, getAppearance, () => "system" as const);
  const changedHere = useRef(false);
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(
      createClient()
        .from("user_settings")
        .select("appearance")
        .eq("user_id", userId)
        .maybeSingle(),
    ).then(
      ({ data }) => {
        // A choice made while this loaded is newer than what the account has.
        if (cancelled || changedHere.current || !isAppearance(data?.appearance)) return;
        if (data.appearance !== getAppearance()) setLocalAppearance(data.appearance);
      },
      () => {
        // Offline: this browser's copy keeps showing.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Shows it at once and saves it. Gives back what went wrong saving, or null. */
  const setAppearance = useCallback(
    (next: Appearance): Promise<string | null> => {
      changedHere.current = true;
      setLocalAppearance(next);
      // One at a time, so the last choice is the one the account ends up with.
      const save = saving.current.then(async () => {
        if (getAppearance() !== next) return null;
        const { error } = await createClient()
          .from("user_settings")
          .upsert({ user_id: userId, appearance: next });
        return error ? "Couldn’t save this to your account. It’s only set in this browser." : null;
      });
      saving.current = save.catch(() => null);
      return save.catch(
        () => "Couldn’t save this to your account. It’s only set in this browser.",
      );
    },
    [userId],
  );

  return { appearance, setAppearance };
}
