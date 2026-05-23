import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowUp, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
  large?: boolean;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  onSubmit,
  loading,
  placeholder = "Ask anything...",
  large,
  className,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, large ? 180 : 150)}px`;
  }, [large, value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) onSubmit();
    }
  }

  const hasValue = value.trim().length > 0;

  return (
    <div
      className={cn(
        "input-glow group relative flex w-full items-end gap-3 rounded-xl border border-input bg-card shadow-sm transition-colors",
        "focus-within:border-ring/70",
        large ? "px-4 py-3.5 sm:px-5 sm:py-4" : "px-3.5 py-3",
        className,
      )}
    >
      {large && (
        <Search
          className="mb-1 size-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-foreground"
          aria-hidden
        />
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={loading}
        aria-label="Search query"
        className={cn(
          "min-w-0 flex-1 resize-none bg-transparent text-foreground outline-none",
          "placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60",
          large
            ? "max-h-[180px] min-h-8 text-[17px] leading-8"
            : "max-h-[150px] min-h-7 text-[15px] leading-7",
        )}
      />

      <Button
        type="button"
        size={large ? "icon-lg" : "icon"}
        className={cn(
          "mb-0.5 shrink-0 rounded-lg bg-foreground text-background shadow-none transition-transform hover:bg-foreground/90 active:scale-95",
          !hasValue && "opacity-40",
        )}
        disabled={loading || !hasValue}
        onClick={onSubmit}
        aria-label="Submit search"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowUp className="size-4" />
        )}
      </Button>
    </div>
  );
}
