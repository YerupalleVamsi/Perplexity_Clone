import { Brain, Code2, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const PROMPTS = [
  {
    icon: Brain,
    text: "Build a learning plan for machine learning",
    label: "Learning",
  },
  {
    icon: Code2,
    text: "Compare React and Vue for a startup dashboard",
    label: "Dev",
  },
  {
    icon: Zap,
    text: "Summarize recent renewable energy breakthroughs",
    label: "Science",
  },
  {
    icon: Globe,
    text: "Explain JWT authentication in plain language",
    label: "Security",
  },
];

type Props = {
  onSelect: (text: string) => void;
  disabled?: boolean;
};

export function SuggestedPrompts({ onSelect, disabled }: Props) {
  return (
    <div className="mt-6 grid w-full max-w-3xl gap-2 sm:grid-cols-2">
      {PROMPTS.map((prompt) => {
        const Icon = prompt.icon;
        return (
          <button
            key={prompt.text}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt.text)}
            className={cn(
              "group flex min-h-[78px] items-start gap-3 rounded-lg border border-border bg-card/60 p-3.5 text-left",
              "transition-colors hover:border-ring/50 hover:bg-accent/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase text-muted-foreground">
                {prompt.label}
              </span>
              <span className="mt-1 block text-[14px] leading-5 text-foreground/85">
                {prompt.text}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
