"use client";

import { EllipsisVertical } from "lucide-react";
import { useEffect, useId, useRef, useState, type ToggleEvent } from "react";

export type OverflowAction = {
  label: string;
  onSelect: () => void;
  /** Red, for something that undoes or removes, like Disconnect. */
  destructive?: boolean;
};

const MENU_WIDTH = 170;
const ITEM_HEIGHT = 44;
/** The menu's padding and border, top and bottom together. */
const MENU_CHROME = 14;
const GAP = 4;
const SCREEN_MARGIN = 16;

/**
 * The Android app's ⋮ button: a small menu under it, lined up with its right edge, or above it when
 * there isn't room below. It's a browser popover, so a modal's edges don't cut it off.
 */
export function OverflowMenu({
  actions,
  label,
}: {
  actions: readonly OverflowAction[];
  label: string;
}) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => menu.current?.hidePopover();
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const place = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState !== "open" || !trigger.current) return;
    const box = trigger.current.getBoundingClientRect();
    const height = actions.length * ITEM_HEIGHT + MENU_CHROME;
    const opensUp =
      box.bottom + GAP + height > window.innerHeight - SCREEN_MARGIN &&
      box.top - GAP - height >= SCREEN_MARGIN;
    event.currentTarget.style.left = `${Math.max(8, box.right - MENU_WIDTH)}px`;
    event.currentTarget.style.top = `${opensUp ? box.top - GAP - height : box.bottom + GAP}px`;
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          open ? "bg-field" : ""
        }`}
      >
        <EllipsisVertical aria-hidden="true" className="size-5" />
      </button>

      <div
        ref={menu}
        id={menuId}
        popover="auto"
        onBeforeToggle={place}
        onToggle={(event) => setOpen(event.newState === "open")}
        style={{ width: MENU_WIDTH }}
        className="fixed inset-auto m-0 rounded-xl border border-line bg-surface py-1.5 text-text shadow-lg"
      >
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              menu.current?.hidePopover();
              action.onSelect();
            }}
            className={`flex h-11 w-full cursor-pointer items-center px-4 text-left text-[15px] transition-colors hover:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
              action.destructive ? "text-danger" : "text-text"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}
