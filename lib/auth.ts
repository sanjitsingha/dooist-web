import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/** What a sign-in action gives back: null, or what went wrong, ready to show. */
export type AuthProblem = string | null;

const SIGNED_OUT = "You’ve been signed out. Log in again and try once more.";

/** A Supabase error as a short sentence, worded like the Android app. */
function describe(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "Couldn’t reach the server. Check your internet connection and try again.";
  }
  if (isAuthError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return "That email and password don’t match.";
      case "user_already_exists":
      case "email_exists":
        return "There’s already an account with this email. Try logging in.";
      case "email_not_confirmed":
        return "Confirm your email first, using the link we sent you.";
      case "weak_password":
        return "Choose a stronger password.";
      case "email_address_invalid":
        return "That email address doesn’t look right.";
      case "over_email_send_rate_limit":
      case "over_request_rate_limit":
        return "Too many tries. Wait a few minutes and try again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Where Google and the confirmation email come back to. */
function callbackUrl() {
  return `${window.location.origin}/auth/callback`;
}

export async function logIn(email: string, password: string): Promise<AuthProblem> {
  try {
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? describe(error) : null;
  } catch (error) {
    return describe(error);
  }
}

/** Makes an account. `confirm` is true when the email must be confirmed before logging in. */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<{ error: AuthProblem; confirm: boolean }> {
  try {
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: callbackUrl(),
      },
    });
    if (error) return { error: describe(error), confirm: false };
    return { error: null, confirm: !data.session };
  } catch (error) {
    return { error: describe(error), confirm: false };
  }
}

/** Leaves for Google's page. It comes back through app/auth/callback/route.ts. */
export async function signInWithGoogle(): Promise<AuthProblem> {
  try {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    return error ? describe(error) : null;
  } catch (error) {
    return describe(error);
  }
}

/**
 * Saved as `display_name`, like the Android app, because Supabase rewrites Google's `name` at each
 * Google sign-in. The session is then refreshed, since the server reads the name from its token.
 */
export async function updateDisplayName(name: string): Promise<AuthProblem> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    if (isAuthSessionMissingError(error)) return SIGNED_OUT;
    if (error) return describe(error);
    // The name is saved either way. A failed refresh only delays it showing here.
    await supabase.auth.refreshSession().catch(() => undefined);
    return null;
  } catch (error) {
    return describe(error);
  }
}

/** For someone who signed up with Google, this adds email and password as a second way in. */
export async function changePassword(password: string): Promise<AuthProblem> {
  try {
    const { error } = await createClient().auth.updateUser({ password });
    if (!error) return null;
    if (isAuthSessionMissingError(error)) return SIGNED_OUT;
    if (isAuthError(error) && error.code === "reauthentication_needed") {
      return "For your security, log out and log back in, then try again.";
    }
    return describe(error);
  } catch (error) {
    return describe(error);
  }
}

/** Signs out in this browser only. Other devices stay signed in. */
export async function logOut(): Promise<AuthProblem> {
  try {
    const { error } = await createClient().auth.signOut({ scope: "local" });
    return error ? describe(error) : null;
  } catch (error) {
    return describe(error);
  }
}
