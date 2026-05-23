/// <reference types="bun" />

declare module "bun" {
  interface Env {
    BUN_PUBLIC_SUPABASE_URL: string;
    BUN_PUBLIC_SUPABASE_ANON_KEY: string;
    BUN_PUBLIC_BACKEND_URL: string;
  }
}
