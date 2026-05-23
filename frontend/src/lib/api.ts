import axios from "axios";
import { createClient } from "@/lib/client";
import { BACKEND_URL } from "@/config";

const supabase = createClient();

export const SOURCES_MARKER = "\n<SOURCES>\n";
export const STREAM_DELIMITER = "\n---STREAM---\n";
const ASSISTANT_METADATA_OPEN = "\n<ASSISTANT_METADATA>\n";
const ASSISTANT_METADATA_CLOSE = "\n</ASSISTANT_METADATA>";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use(async (config) => {
  const headers = await getAuthHeaders();
  config.headers.Authorization = headers.Authorization;
  return config;
});

export type ChatSummary = {
  id: string;
  title: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

export type ChatMessage = {
  id: string;
  content: string;
  role: "User" | "Assistant";
  createdAt: string;
};

export type Source = {
  url: string;
  title: string;
  snippet?: string;
  favicon?: string;
  image?: string;
};

function normalizeSource(s: Record<string, unknown>): Source | null {
  const url = s.url;
  if (typeof url !== "string" || !url) return null;
  return {
    url,
    title: typeof s.title === "string" ? s.title : url,
    snippet: typeof s.snippet === "string" ? s.snippet : undefined,
    favicon: typeof s.favicon === "string" ? s.favicon : undefined,
    image: typeof s.image === "string" ? s.image : undefined,
  };
}

function parseSourcesJson(raw: string): Source[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) =>
        item && typeof item === "object"
          ? normalizeSource(item as Record<string, unknown>)
          : null,
      )
      .filter((s): s is Source => s !== null);
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]) as unknown[];
      return parsed
        .map((item) =>
          item && typeof item === "object"
            ? normalizeSource(item as Record<string, unknown>)
            : null,
        )
        .filter((s): s is Source => s !== null);
    } catch {
      return [];
    }
  }
}

function extractAnswer(text: string): string {
  const withoutFollowUps = text.replace(/<FOLLOW_UPS>[\s\S]*/i, "").trim();
  const answerMatch = withoutFollowUps.match(/<ANSWER>([\s\S]*?)(?:<\/ANSWER>|$)/i);
  if (answerMatch?.[1]) return answerMatch[1].trim();
  return withoutFollowUps.replace(/<\/?ANSWER>/gi, "").trim();
}

export function parseStreamResponse(raw: string): {
  answer: string;
  sources: Source[];
  followUps: string[];
} {
  const sourcesIdx = raw.indexOf(SOURCES_MARKER);
  const delimIdx = raw.indexOf(STREAM_DELIMITER);

  let sources: Source[] = [];
  let textPart = raw;

  if (sourcesIdx !== -1 && delimIdx !== -1 && delimIdx > sourcesIdx) {
    sources = parseSourcesJson(
      raw.slice(sourcesIdx + SOURCES_MARKER.length, delimIdx),
    );
    textPart = raw.slice(delimIdx + STREAM_DELIMITER.length);
  } else if (sourcesIdx !== -1) {
    textPart = raw.slice(0, sourcesIdx);
    sources = parseSourcesJson(raw.slice(sourcesIdx + SOURCES_MARKER.length));
  }

  const answer = extractAnswer(textPart);

  const followUps: string[] = [];
  const block = textPart.match(/<FOLLOW_UPS>([\s\S]*?)(?:<\/FOLLOW_UPS>|$)/i)?.[1];
  if (block) {
    for (const m of block.matchAll(/<question>([\s\S]*?)<\/question>/gi)) {
      const q = m[1]?.trim();
      if (q) followUps.push(q);
    }
  }

  return { answer, sources, followUps };
}

export function parseStoredAssistantMessage(content: string): {
  content: string;
  sources: Source[];
  followUps: string[];
} {
  const markerIndex = content.indexOf(ASSISTANT_METADATA_OPEN);
  if (markerIndex === -1) {
    return { content, sources: [], followUps: [] };
  }

  const answer = content.slice(0, markerIndex).trim();
  const metadataStart = markerIndex + ASSISTANT_METADATA_OPEN.length;
  const metadataEnd = content.indexOf(ASSISTANT_METADATA_CLOSE, metadataStart);
  const rawMetadata =
    metadataEnd === -1
      ? content.slice(metadataStart)
      : content.slice(metadataStart, metadataEnd);

  try {
    const parsed = JSON.parse(rawMetadata.trim()) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { content: answer, sources: [], followUps: [] };
    }

    const data = parsed as Record<string, unknown>;
    const sources = Array.isArray(data.sources)
      ? data.sources
          .map((item) =>
            item && typeof item === "object"
              ? normalizeSource(item as Record<string, unknown>)
              : null,
          )
          .filter((s): s is Source => s !== null)
      : [];
    const followUps = Array.isArray(data.followUps)
      ? data.followUps.filter((q): q is string => typeof q === "string" && q.length > 0)
      : [];

    return { content: answer, sources, followUps };
  } catch {
    return { content: answer, sources: [], followUps: [] };
  }
}

export async function fetchChats() {
  const { data } = await api.get<{ chats: ChatSummary[] }>("/chats");
  return data.chats;
}

export async function fetchChat(chatId: string) {
  const { data } = await api.get<{
    chat: ChatSummary & { messages: ChatMessage[] };
  }>(`/chats/${chatId}`);
  return data.chat;
}

export async function syncUser() {
  const { data } = await api.post("/signin");
  return data;
}

export async function streamAsk(
  query: string,
  chatId: string | undefined,
  onChunk: (buffer: string) => void,
): Promise<{ chatId: string; fullText: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/perplexity_ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: headers.Authorization,
    } as Record<string, string>,
    body: JSON.stringify({ query, chatId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  const newChatId = res.headers.get("X-Chat-Id") ?? chatId ?? "";
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
    onChunk(fullText);
  }

  return { chatId: newChatId, fullText };
}

export async function streamFollowUp(
  query: string,
  chatId: string,
  onChunk: (buffer: string) => void,
): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}/perplexity_ask_follow_ups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: headers.Authorization,
    } as Record<string, string>,
    body: JSON.stringify({ query, chatId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
    onChunk(fullText);
  }
  return fullText;
}
