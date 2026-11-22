import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { PRIVACY_PATH } from "@/lib/site";
import { supabaseConfig } from "@/lib/supabase/config";

/** Only for people who aren't signed in. */
const AUTH_PAGES = ["/login", "/register"];
/** Open to everyone: public pages, and finishing a sign-in, which happens before there's a session. */
const PUBLIC_PATHS = ["/auth/callback", PRIVACY_PATH];

/** Keeps the session fresh, and sends people to the right side of the login wall. */
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        cacheHeaders = { ...cacheHeaders, ...headers };
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  if (PUBLIC_PATHS.includes(path)) return response;

  const isAuthPage = AUTH_PAGES.includes(path);
  if (signedIn === isAuthPage) {
    const target = request.nextUrl.clone();
    target.pathname = signedIn ? "/" : "/login";
    target.search = "";
    const redirect = NextResponse.redirect(target);
    // A refreshed session has to survive the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(cacheHeaders).forEach(([name, value]) => redirect.headers.set(name, value));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|dooist-icon.png|.*\\.svg$).*)"],
};
