import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name?: string;
  /** The profile picture, which Google accounts bring with them. */
  avatarUrl?: string;
};

/**
 * Who's signed in, or a redirect to log in. Uses the same check as proxy.ts, so the two can
 * never disagree and bounce someone between pages.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // `name` is set by sign up; Google accounts bring `name` and `full_name`.
  const name = claims.user_metadata?.name ?? claims.user_metadata?.full_name;
  const picture = claims.user_metadata?.avatar_url ?? claims.user_metadata?.picture;
  return {
    id: claims.sub,
    email: claims.email ?? "",
    name: typeof name === "string" && name.trim() ? name.trim() : undefined,
    avatarUrl: typeof picture === "string" && picture.startsWith("https://") ? picture : undefined,
  };
}
