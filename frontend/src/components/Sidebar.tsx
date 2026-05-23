import {
  Clock3,
  LogOut,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  chats: ChatSummary[];
  activeChatId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onSignOut: () => void;
  email?: string | null;
  loading?: boolean;
};

export function Sidebar({
  chats,
  activeChatId,
  collapsed,
  onToggle,
  onNewChat,
  onSelectChat,
  onSignOut,
  email,
  loading,
}: Props) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl transition-[width,transform] duration-200 ease-out md:static",
          collapsed
            ? "w-0 -translate-x-full md:w-14 md:translate-x-0"
            : "w-[268px] translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border px-3",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <Search className="size-4" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[14px] font-semibold">Perplex</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  AI Search
                </p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Toggle sidebar"
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        <div className={cn("p-2", collapsed && "px-2")}>
          <Button
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/70 px-3 shadow-none hover:bg-sidebar-accent",
              collapsed && "size-10 justify-center px-0",
            )}
            onClick={onNewChat}
            title="New thread"
          >
            <MessageSquarePlus className="size-4 shrink-0" />
            {!collapsed && <span className="text-[14px]">New thread</span>}
          </Button>
        </div>

        {!collapsed && (
          <nav className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="mb-2 flex items-center gap-1.5 px-2 pt-2">
              <Clock3 className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium uppercase text-muted-foreground">
                Recent
              </p>
            </div>

            {loading ? (
              <ul className="space-y-1 px-1">
                {[1, 2, 3, 4].map((i) => (
                  <li
                    key={i}
                    className="h-9 rounded-lg skeleton"
                    style={{ opacity: 1 - i * 0.14 }}
                  />
                ))}
              </ul>
            ) : chats.length === 0 ? (
              <div className="px-3 py-8 text-[13px] leading-6 text-muted-foreground">
                Your searches will appear here.
              </div>
            ) : (
              <ul className="space-y-1">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={cn(
                        "group relative w-full rounded-lg px-3 py-2 text-left text-[14px] leading-snug transition-colors",
                        "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        activeChatId === chat.id &&
                          "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                      )}
                    >
                      <span className="line-clamp-2">
                        {chat.title ?? "Untitled"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        )}

        {collapsed && (
          <div className="flex flex-1 justify-center pt-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-muted-foreground">
              <Search className="size-4" />
            </div>
          </div>
        )}

        <div className={cn("border-t border-sidebar-border p-2", collapsed && "px-2")}>
          <Button
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-2 rounded-lg px-3 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "size-10 justify-center px-0",
            )}
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[13px] font-medium leading-4 text-sidebar-foreground">
                  Sign out
                </span>
                {email && (
                  <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                    {email}
                  </span>
                )}
              </span>
            )}
          </Button>
        </div>
      </aside>

      {!collapsed && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onToggle}
          aria-label="Close sidebar"
        />
      )}
    </>
  );
}
