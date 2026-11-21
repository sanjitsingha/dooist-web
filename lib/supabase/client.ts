import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

import { supabaseConfig } from "./config";

/** Supabase in the browser. The session lives in cookies, so the server can read it too. */
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient<Database>(url, key);
}
