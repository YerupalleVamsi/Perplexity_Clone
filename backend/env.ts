export const SUPABASE_URL = process.env.BUN_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.BUN_SECRET_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env. Set BUN_PUBLIC_SUPABASE_URL and BUN_SECRET_SUPABASE_ANON_KEY in backend/.env",
  );
}
