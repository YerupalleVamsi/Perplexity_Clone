import { useEffect } from "react";
import { useNavigate } from "react-router";
import { createClient } from "@/lib/client";

const supabase = createClient();

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) navigate("/auth", { replace: true });
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        navigate(data.session ? "/" : "/auth", { replace: true });
      }
    }

    finishAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return null;
}
