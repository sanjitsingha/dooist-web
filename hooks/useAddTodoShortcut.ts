"use client";

import { useEffect } from "react";

/** Ctrl+Y has no browser action in Chrome, Edge, Firefox or Safari. */
export const ADD_TODO_SHORTCUT = "Ctrl+Y";

/** Runs `onPress` on the Add todo shortcut, unless the person is typing or a modal is open. */
export function useAddTodoShortcut(onPress: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "y" && event.key !== "Y") return;
      if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.repeat || event.isComposing || event.defaultPrevented) return;
      const { target } = event;
      // In a text box, Ctrl+Y stays redo.
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable]")
      ) {
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      onPress();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPress]);
}
