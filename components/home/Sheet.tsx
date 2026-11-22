"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";

/** A bottom sheet on phones and a centered panel on desktop. One can open on top of another. */
export function Sheet({
  label,
  small = false,
  large = false,
  medium = false,
  wide = false,
  flush = false,
  fixedHeight = false,
  onRequestClose,
  children,
}: {
  label: string;
  /** A narrower panel, for a date or time picker, on desktop. */
  small?: boolean;
  /** A wider panel with more room around it, on desktop. */
  large?: boolean;
  /** As wide as `large` on desktop, with the usual tighter padding. For adding and editing todos. */
  medium?: boolean;
  /** Two panes that lay out and scroll on their own, so the sheet adds no padding or scrolling. */
  wide?: boolean;
  /** One column edge to edge, like Search, that lays out and scrolls its own content. */
  flush?: boolean;
  /** Keeps one height whatever's inside, so moving between views doesn't resize it. */
  fixedHeight?: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);

  // A layout effect so it closes while still in the page, which hands focus back to its opener.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        // Escape in a sheet open on top of this one closes only that sheet.
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onRequestClose();
      }}
      onMouseDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a full click on the backdrop, not a text selection dragged out of the sheet.
        if (event.target === event.currentTarget && pressedBackdrop.current) onRequestClose();
      }}
      className={`mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-surface text-text backdrop:bg-scrim md:m-auto md:rounded-3xl ${
        wide
          ? "h-[88dvh] overflow-hidden md:h-[600px] md:w-[min(860px,calc(100vw-48px))]"
          : flush
            ? "h-[88dvh] overflow-hidden md:h-[560px] md:w-[min(720px,calc(100vw-48px))]"
            : `overflow-y-auto ${large || medium ? "md:w-[640px]" : small ? "md:w-[400px]" : "md:w-[480px]"}`
      } ${fixedHeight ? "h-[88dvh] md:h-[560px]" : ""}`}
    >
      <div
        className={`relative ${
          wide || flush ? "h-full" : "px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]"
        } ${large ? "md:p-8" : ""}`}
      >
        <button
          type="button"
          onClick={onRequestClose}
          aria-label="Close"
          className={`absolute top-3 right-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink ${
            large || wide ? "md:top-6 md:right-6" : ""
          }`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
