"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { signInWithGoogle } from "@/lib/auth";

const BUTTON =
  "flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-5 animate-spin rounded-full border-2 border-current/25 border-t-current"
    />
  );
}

/** The form's main button. Shows a spinner while the form is being sent. */
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      aria-busy={pending}
      className={`${BUTTON} mt-2 bg-primary text-white hover:bg-primary-pressed`}
    >
      {pending ? <Spinner /> : label}
    </button>
  );
}

/** What went wrong, in red above the main button. */
export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm leading-5 text-danger">
      {message}
    </p>
  );
}

/** Leaves for Google's sign-in page. Problems go to `onError`, for the form's error line. */
export function GoogleButton({ onError }: { onError: (message: string | null) => void }) {
  const [busy, setBusy] = useState(false);

  // Pressing Back on Google's page can restore this page as it was, spinner included.
  useEffect(() => {
    const stopIfRestored = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", stopIfRestored);
    return () => window.removeEventListener("pageshow", stopIfRestored);
  }, []);

  const continueWithGoogle = async () => {
    onError(null);
    setBusy(true);
    const problem = await signInWithGoogle();
    // On success the browser is already leaving, so the spinner stays until it's gone.
    if (problem) {
      setBusy(false);
      onError(problem);
    }
  };

  return (
    <button
      type="button"
      onClick={continueWithGoogle}
      disabled={busy}
      aria-label="Continue with Google"
      aria-busy={busy}
      className={`${BUTTON} border border-line bg-surface text-text hover:bg-field`}
    >
      {busy ? (
        <Spinner />
      ) : (
        <>
          <GoogleIcon />
          Continue with Google
        </>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.86-3c-1.07.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/** A thin line with "or" in the middle, between the email form and the Google button. */
export function OrDivider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[13px] text-muted">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** "New here? Create an account", under the form. */
export function FooterPrompt({
  prompt,
  action,
  href,
}: {
  prompt: string;
  action: string;
  href: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-muted">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-ink hover:underline">
        {action}
      </Link>
    </p>
  );
}
