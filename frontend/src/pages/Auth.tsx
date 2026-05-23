import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GitHubIcon, GoogleIcon } from "@/components/OAuthIcons";
import { cn } from "@/lib/utils";

export default function Auth() {
  const { loading, error, login, isSignedIn } = useAuth();

  useEffect(() => {
    document.title = "Sign in - Perplex";
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isSignedIn) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Search className="size-4" />
          </div>
          <span className="text-[14px] font-semibold">Perplex</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[392px]">
          <div className="mb-7 text-center">
            <h1 className="text-[28px] font-semibold leading-tight tracking-normal">
              Sign in to Perplex
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
              Continue to your search threads.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-[13px] text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <OAuthButton
                label="Continue with GitHub"
                icon={<GitHubIcon className="size-5" />}
                onClick={() => login("github")}
              />
              <OAuthButton
                label="Continue with Google"
                icon={<GoogleIcon className="size-5" />}
                onClick={() => login("google")}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function OAuthButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4",
        "text-[14px] font-medium text-foreground shadow-sm transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "active:scale-[0.99]",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      {label}
    </button>
  );
}
