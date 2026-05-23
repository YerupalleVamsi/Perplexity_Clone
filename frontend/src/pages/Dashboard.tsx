import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Loader2, Menu, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { SearchInput } from "@/components/SearchInput";
import { MessageList, type DisplayMessage } from "@/components/MessageList";
import { SuggestedPrompts } from "@/components/SuggestedPrompts";
import {
  fetchChat,
  fetchChats,
  parseStoredAssistantMessage,
  parseStreamResponse,
  streamAsk,
  streamFollowUp,
  syncUser,
  type ChatSummary,
} from "@/lib/api";

export default function Dashboard() {
  const { email, loading: authLoading, logout, isSignedIn } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768,
  );
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useAutoScroll<HTMLDivElement>(
    [messages, asking],
    messages.length > 0,
  );

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    try {
      const list = await fetchChats();
      setChats(list);
    } catch (e) {
      console.error(e);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Perplex - AI Search";
    if (!isSignedIn) return;
    syncUser().then(loadChats).catch(console.error);
  }, [isSignedIn, loadChats]);

  const loadChat = useCallback(async (chatId: string) => {
    setChatLoading(true);
    setError(null);
    try {
      const chat = await fetchChat(chatId);
      setActiveChatId(chat.id);
      setMessages(
        chat.messages.map((m) => {
          if (m.role === "Assistant") {
            const parsed = parseStoredAssistantMessage(m.content);
            return {
              id: m.id,
              role: "assistant",
              content: parsed.content,
              sources: parsed.sources,
              followUps: parsed.followUps,
            };
          }

          return {
            id: m.id,
            role: "user",
            content: m.content,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load thread");
    } finally {
      setChatLoading(false);
    }
  }, []);

  async function handleAsk(text: string) {
    const q = text.trim();
    if (!q || asking) return;

    setError(null);
    setAsking(true);
    const userMsg: DisplayMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: q,
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setQuery("");

    try {
      const { chatId, fullText } = await streamAsk(
        q,
        activeChatId ?? undefined,
        (buffer) => {
          const parsed = parseStreamResponse(buffer);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: parsed.answer,
                    sources: parsed.sources.length > 0 ? parsed.sources : m.sources,
                    streaming: true,
                  }
                : m,
            ),
          );
        },
      );

      const parsed = parseStreamResponse(fullText);
      setActiveChatId(chatId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: parsed.answer,
                sources: parsed.sources,
                followUps: parsed.followUps,
                streaming: false,
              }
            : m,
        ),
      );
      await loadChats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setAsking(false);
    }
  }

  async function handleFollowUp(text: string) {
    const q = text.trim();
    if (!activeChatId || !q || asking) return;

    setAsking(true);
    setError(null);
    setQuery("");
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: q },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const fullText = await streamFollowUp(q, activeChatId, (buffer) => {
        const parsed = parseStreamResponse(buffer);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: parsed.answer,
                  sources: parsed.sources.length > 0 ? parsed.sources : m.sources,
                  streaming: true,
                }
              : m,
          ),
        );
      });
      const parsed = parseStreamResponse(fullText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: parsed.answer,
                sources: parsed.sources,
                followUps: parsed.followUps,
                streaming: false,
              }
            : m,
        ),
      );
      await loadChats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAsking(false);
    }
  }

  function handleNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setQuery("");
    setError(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function submitQuery() {
    if (activeChatId && messages.length > 0) {
      handleFollowUp(query);
    } else {
      handleAsk(query);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
        <p className="text-[13px] text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/auth" replace />;

  const isHome = messages.length === 0 && !chatLoading;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        collapsed={!sidebarOpen}
        loading={chatsLoading}
        email={email}
        onToggle={() => setSidebarOpen((o) => !o)}
        onNewChat={handleNewChat}
        onSignOut={logout}
        onSelectChat={(id) => {
          loadChat(id);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </Button>

            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <Search className="size-3.5" />
              </div>
              <span className="truncate text-[14px] font-semibold">Perplex</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 flex-col">
          {isHome ? (
            <div className="flex flex-1 overflow-y-auto px-4 py-8 sm:px-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col justify-center">
                <div className="mb-7 text-center">
                  <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <Search className="size-5 text-muted-foreground" />
                  </div>
                  <h1 className="text-[32px] font-semibold leading-tight tracking-normal text-foreground sm:text-[40px]">
                    What do you want to know?
                  </h1>
                </div>

                <SearchInput
                  large
                  value={query}
                  onChange={setQuery}
                  onSubmit={() => handleAsk(query)}
                  loading={asking}
                  placeholder="Ask anything..."
                />

                <SuggestedPrompts
                  disabled={asking}
                  onSelect={(text) => {
                    setQuery(text);
                    handleAsk(text);
                  }}
                />

                {error && (
                  <p
                    role="alert"
                    className="mt-5 text-center text-[13px] text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scroll-smooth px-4 py-8 sm:px-6 lg:px-8"
            >
              {chatLoading ? (
                <div className="mx-auto max-w-3xl space-y-4 py-6">
                  <div className="h-8 w-3/4 rounded-lg skeleton" />
                  <div className="mt-8 h-4 w-full rounded-md skeleton" />
                  <div className="h-4 w-11/12 rounded-md skeleton" />
                  <div className="h-4 w-5/6 rounded-md skeleton" />
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  asking={asking}
                  onFollowUp={handleFollowUp}
                />
              )}
              {error && (
                <p
                  role="alert"
                  className="mx-auto mb-6 max-w-3xl text-[13px] text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </main>

        {!isHome && (
          <footer className="shrink-0 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
            <div className="mx-auto max-w-3xl">
              <SearchInput
                value={query}
                onChange={setQuery}
                onSubmit={submitQuery}
                loading={asking}
                placeholder="Ask a follow-up..."
              />
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
