export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .slice(0, 48)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "chat"
  );
}

export function parseStructuredResponse(raw: string): {
  answer: string;
  followUps: string[];
} {
  const answerMatch = raw.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/i);
  const answer = answerMatch?.[1]?.trim() ?? raw.trim();

  const followUps: string[] = [];
  const followBlock = raw.match(/<FOLLOW_UPS>([\s\S]*?)<\/FOLLOW_UPS>/i)?.[1];
  if (followBlock) {
    const questions = followBlock.matchAll(/<question>([\s\S]*?)<\/question>/gi);
    for (const q of questions) {
      const text = q[1]?.trim();
      if (text) followUps.push(text);
    }
  }

  return { answer, followUps };
}

export type SourcePayload = {
  url: string;
  title: string;
  snippet?: string;
  favicon?: string;
  image?: string;
};

type TavilyImage = string | { url?: string };
type TavilyResult = {
  url: string;
  title: string;
  content: string;
  favicon?: string;
};

const ASSISTANT_METADATA_OPEN = "\n<ASSISTANT_METADATA>\n";
const ASSISTANT_METADATA_CLOSE = "\n</ASSISTANT_METADATA>";

function thumbnailForUrl(url: string): string {
  return `https://image.thum.io/get/width/400/height/240/noanimate/${url}`;
}

function pickImage(
  images: TavilyImage[],
  pageUrl: string,
  index: number,
): string | undefined {
  const imageUrls = images
    .map((img) => (typeof img === "string" ? img : img.url))
    .filter((url): url is string => typeof url === "string" && url.length > 0);

  if (imageUrls.length === 0) return thumbnailForUrl(pageUrl);

  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, "");
    const matched = imageUrls.find((url) => {
      try {
        const imgHost = new URL(url).hostname.replace(/^www\./, "");
        return imgHost === host || imgHost.endsWith(host) || host.endsWith(imgHost);
      } catch {
        return false;
      }
    });
    return matched ?? imageUrls[index % imageUrls.length] ?? thumbnailForUrl(pageUrl);
  } catch {
    return imageUrls[index % imageUrls.length] ?? thumbnailForUrl(pageUrl);
  }
}

export function buildSourcesFromTavily(response: {
  results: TavilyResult[];
  images?: TavilyImage[];
}): SourcePayload[] {
  const images = response.images ?? [];
  return response.results.map((r, i) => ({
    url: r.url,
    title: r.title,
    snippet: r.content?.slice(0, 180).trim(),
    favicon: r.favicon,
    image: pickImage(images, r.url, i),
  }));
}

export const SOURCES_MARKER = "\n<SOURCES>\n";
export const STREAM_DELIMITER = "\n---STREAM---\n";

export function serializeAssistantMessage({
  answer,
  sources,
  followUps,
}: {
  answer: string;
  sources: SourcePayload[];
  followUps: string[];
}): string {
  return `${answer.trim()}${ASSISTANT_METADATA_OPEN}${JSON.stringify({
    sources,
    followUps,
  })}${ASSISTANT_METADATA_CLOSE}`;
}

export function assistantAnswerOnly(content: string): string {
  const markerIndex = content.indexOf(ASSISTANT_METADATA_OPEN);
  if (markerIndex === -1) return content;
  return content.slice(0, markerIndex).trim();
}

export function buildHistoryPrompt(
  messages: { role: string; content: string }[],
  webResults: unknown,
  query: string,
): string {
  const history = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  return `## Conversation history
${history}

## Web search results
${JSON.stringify(webResults)}

## USER_QUERY
${query}`;
}
