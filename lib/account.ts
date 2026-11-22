"use server";

import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

const FAILED = "Couldn’t delete your account. Please try again.";
const SIGNED_OUT = "You’ve been signed out. Log in again and try once more.";

/**
 * Deletes the signed-in account for good, through the delete-account Edge Function the Android app
 * uses. It runs on the server because that function doesn't accept calls from browsers. Gives
 * back null, or what went wrong, ready to show.
 */
export async function deleteAccount(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return SIGNED_OUT;

    const { error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error) {
      if (error instanceof FunctionsFetchError) {
        return "Couldn’t reach the server. Check your internet connection and try again.";
      }
      if (error instanceof FunctionsHttpError && error.context.status === 401) return SIGNED_OUT;
      return FAILED;
    }

    // The account is gone, so only this browser's copy of the sign-in is left to clear.
    const store = await cookies();
    for (const { name } of store.getAll()) {
      if (name.startsWith("sb-")) store.delete(name);
    }
    return null;
  } catch {
    return FAILED;
  }
}
