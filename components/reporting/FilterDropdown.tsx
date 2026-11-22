"use client";

import { ChevronDown, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ToggleEvent,
} from "react";

/** A small dropdown for the Reporting filters. Clicking away or pressing Escape closes it. */
export function FilterDropdown({
  label,
  summary,
  widthClass,
  menuWidth,
  onClear,
  onClosed,
  children,
}: {
  label: string;
  summary: ReactNode;
  widthClass: string;
  /** The open list's width, if it isn't the button's. */
  menuWidth?: number;
  /** Shows a clear button in place of the arrow. */
  onClear?: () => void;
  onClosed?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // It's placed once on opening, so moving the page away from it closes it.
  useEffect(() => {
    if (!open) return;
    const hide = () => menu.current?.hidePopover();
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
      hide();
    };
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  // Coming back to this page shows it closed, with the choices still in place.
  useLayoutEffect(() => {
    const element = menu.current;
    return () => {
      if (element?.matches(":popover-open")) element.hidePopover();
    };
  }, []);

  const placeMenu = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState !== "open" || !trigger.current) return;
    const { left, bottom, width } = trigger.current.getBoundingClientRect();
    const shownWidth = Math.min(menuWidth ?? width, window.innerWidth - 16);
    const { style } = event.currentTarget;
    style.width = `${shownWidth}px`;
    style.left = `${Math.max(8, Math.min(left, window.innerWidth - shownWidth - 8))}px`;
    style.top = `${bottom + 4}px`;
    style.maxHeight = `${window.innerHeight - bottom - 12}px`;
  };

  return (
    <div className={`relative max-w-full ${widthClass}`}>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        aria-label={`${label}: ${summary}`}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-8 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-text transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="truncate">{summary}</span>
        {onClear ? (
          <span aria-hidden="true" className="size-3.5 shrink-0" />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 shrink-0 text-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {onClear ? (
        <button
          type="button"
          onClick={() => {
            onClear();
            trigger.current?.focus();
          }}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}

      <div
        ref={menu}
        id={menuId}
        popover="auto"
        role="group"
        aria-label={label}
        onBeforeToggle={placeMenu}
        onToggle={(event) => {
          setOpen(event.newState === "open");
          if (event.newState === "closed") onClosed?.();
        }}
        className="fixed inset-auto m-0 overflow-y-auto rounded-lg border border-line bg-surface p-1 text-text shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children(() => document.getElementById(menuId)?.hidePopover())}
      </div>
    </div>
  );
}
