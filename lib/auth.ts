import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/** What a sign-in action gives back: null, or what went wrong, ready to show. */
export type AuthProblem = string | null;

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

/** Signs out in this browser only. Other devices stay signed in. */
export async function logOut(): Promise<AuthProblem> {
  try {
    const { error } = await createClient().auth.signOut({ scope: "local" });
    return error ? describe(error) : null;
  } catch (error) {
    return describe(error);
  }
}
