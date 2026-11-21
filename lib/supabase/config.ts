const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** The Supabase project shared with the Android app. Both values are safe to ship to browsers. */
export function supabaseConfig() {
  if (!url || !key) {
    throw new Error(
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    );
  }
  return { url, key };
}
