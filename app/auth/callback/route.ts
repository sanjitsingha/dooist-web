import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Google and the confirmation email land here with a one-time code to swap for a session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("error", "callback");
  return NextResponse.redirect(login);
}
