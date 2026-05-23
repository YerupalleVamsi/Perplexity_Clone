import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ChevronRight, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/api";
import { SourceLinks } from "@/components/SourceLinks";
import { TypingIndicator } from "@/components/TypingIndicator";

export type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  followUps?: string[];
  streaming?: boolean;
};

type Props = {
  messages: DisplayMessage[];
  onFollowUp?: (q: string) => void;
  asking?: boolean;
};

function groupTurns(
  messages: DisplayMessage[],
): { user: DisplayMessage; assistant?: DisplayMessage }[] {
  const turns: { user: DisplayMessage; assistant?: DisplayMessage }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;

    const next = messages[i + 1];
    const assistant = next?.role === "assistant" ? next : undefined;
    turns.push({ user: msg, assistant });
    if (assistant) i += 1;
  }

  return turns;
}

export function MessageList({ messages, onFollowUp, asking }: Props) {
  if (messages.length === 0) return null;

  const turns = groupTurns(messages);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 pb-12">
      {turns.map((turn, turnIdx) => (
        <article key={turn.user.id} className="scroll-mt-20">
          <div className="mb-7">
            <h2 className="max-w-3xl text-[24px] font-semibold leading-tight tracking-normal text-foreground sm:text-[28px]">
              {turn.user.content}
            </h2>
          </div>

          {turn.assistant && (
            <div className="space-y-6 sm:pl-10">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <span className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-foreground">
                  <Sparkles className="size-3.5" />
                </span>
                Answer
              </div>

              {(turn.assistant.sources?.length ?? 0) > 0 && (
                <SourceLinks sources={turn.assistant.sources ?? []} />
              )}

              <AnswerBody
                content={turn.assistant.content}
                streaming={turn.assistant.streaming}
              />

              {turn.assistant.followUps &&
                turn.assistant.followUps.length > 0 &&
                onFollowUp &&
                !turn.assistant.streaming && (
                  <RelatedQuestions
                    questions={turn.assistant.followUps}
                    onSelect={onFollowUp}
                    disabled={asking}
                  />
                )}
            </div>
          )}

          {turnIdx < turns.length - 1 && (
            <div className="mt-12 h-px bg-border/70" aria-hidden />
          )}
        </article>
      ))}
    </div>
  );
}

function AnswerBody({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const empty = !content.trim();

  async function copyAnswer() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="group/answer relative">
      {!empty && !streaming && (
        <button
          type="button"
          onClick={copyAnswer}
          title={copied ? "Copied" : "Copy answer"}
          className={cn(
            "absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm",
            "opacity-0 transition-opacity hover:text-foreground group-hover/answer:opacity-100",
          )}
          aria-label="Copy answer"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      )}

      {empty && streaming ? (
        <TypingIndicator />
      ) : (
        <div className={cn("prose-answer", streaming && "streaming-caret")}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-3 mt-6 text-[22px] font-semibold leading-tight text-foreground">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-6 text-[19px] font-semibold leading-tight text-foreground">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-5 text-[16px] font-semibold leading-snug text-foreground">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-[16px] leading-8 text-foreground/90 last:mb-0">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-foreground/80">{children}</em>
              ),
              ol: ({ children }) => (
                <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>
              ),
              ul: ({ children }) => (
                <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="pl-1 text-[16px] leading-7 text-foreground/90">
                  {children}
                </li>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <code className="block w-full overflow-x-auto rounded-md bg-muted px-4 py-3 font-mono text-[13px] leading-6 text-foreground">
                      {children}
                    </code>
                  );
                }

                return (
                  <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-4 overflow-hidden rounded-md border border-border bg-muted">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-4 border-l-2 border-border pl-4 text-[15px] leading-7 text-muted-foreground">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-6 border-border" />,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 decoration-primary/30 transition-colors hover:decoration-primary/70"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-[14px]">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border-b border-border bg-muted px-4 py-2.5 text-left text-[13px] font-medium text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-border/70 px-4 py-2.5 text-foreground/80 last:border-0">
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function RelatedQuestions({
  questions,
  onSelect,
  disabled,
}: {
  questions: string[];
  onSelect: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-2 pt-1" aria-label="Related questions">
      <h3 className="text-[12px] font-medium uppercase text-muted-foreground">
        Related
      </h3>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {questions.map((q) => (
          <li key={q}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(q)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] leading-5 text-foreground/80 transition-colors hover:bg-accent/60 hover:text-foreground disabled:opacity-50"
            >
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              <span className="min-w-0 flex-1">{q}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
