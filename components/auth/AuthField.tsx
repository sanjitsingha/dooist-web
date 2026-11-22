"use client";

import { useId, useLayoutEffect, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "placeholder"> & {
  /** Shown as the placeholder, and read out by screen readers. */
  label: string;
  /** Hides what's typed, with an eye button to show it. */
  secure?: boolean;
  /** What's wrong with what's typed, in red under the field. */
  error?: string | null;
};

/** A soft gray box that turns white with a dark outline while you type in it. */
export function AuthField({ label, secure = false, error, type = "text", ...inputProps }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const [hidden, setHidden] = useState(true);

  // A password shown with the eye button goes back to hidden when the page is left.
  useLayoutEffect(() => () => setHidden(true), []);

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex h-12 items-center rounded-xl border-[1.5px] border-transparent bg-field px-3.5 transition-colors focus-within:border-primary focus-within:bg-surface">
        <input
          id={id}
          type={secure ? (hidden ? "password" : "text") : type}
          placeholder={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
          {...inputProps}
        />
        {secure ? (
          <button
            type="button"
            onClick={() => setHidden((current) => !current)}
            aria-label={hidden ? "Show password" : "Hide password"}
            className="-mr-1 ml-1 flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          >
            <EyeIcon off={!hidden} />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}
