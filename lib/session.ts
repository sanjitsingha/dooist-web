import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name?: string;
  /** The profile picture, which Google accounts bring with them. */
  avatarUrl?: string;
  /** Signs in with Google, so a password here is a second way in. */
  withGoogle: boolean;
};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Who's signed in, or a redirect to log in. Uses the same check as proxy.ts, so the two can
 * never disagree and bounce someone between pages.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  // Checking a session reads the clock, which Next.js only allows during a real request.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // `display_name` is the name changed in the app or on Android. `name` is set by sign up, and
  // Google accounts bring `name` and `full_name`, which Supabase rewrites at each Google sign-in.
  const meta = claims.user_metadata;
  const picture = meta?.avatar_url ?? meta?.picture;
  const { provider, providers } = claims.app_metadata ?? {};
  return {
    id: claims.sub,
    email: claims.email ?? "",
    name: text(meta?.display_name) ?? text(meta?.name) ?? text(meta?.full_name),
    avatarUrl: typeof picture === "string" && picture.startsWith("https://") ? picture : undefined,
    withGoogle: provider === "google" || (Array.isArray(providers) && providers.includes("google")),
  };
}
