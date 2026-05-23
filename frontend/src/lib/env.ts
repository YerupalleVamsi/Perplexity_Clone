/**
 * Use static process.env.BUN_PUBLIC_* so Bun can inline them in the browser bundle.
 * (Dynamic process.env[name] is not replaced and causes "process is not defined".)
 */
export const SUPABASE_URL = process.env.BUN_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.BUN_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env. Set BUN_PUBLIC_SUPABASE_URL and BUN_PUBLIC_SUPABASE_ANON_KEY in frontend/.env",
  );
}
