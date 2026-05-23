import express, { type Request, type Response } from "express";
import cors from "cors";
import { tavily } from "@tavily/core";
import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompt";
import { prisma } from "./db";
import { middleware } from "./middleware";
import { MessageRole } from "./prisma/generated/enums";
import {
  buildHistoryPrompt,
  buildSourcesFromTavily,
  parseStructuredResponse,
  assistantAnswerOnly,
  serializeAssistantMessage,
  slugify,
  SOURCES_MARKER,
  STREAM_DELIMITER,
} from "./utils";

const tavilySearchOptions = {
  searchDepth: "advanced" as const,
  includeImages: true,
  includeFavicon: true,
  maxResults: 8,
};

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["X-Chat-Id"],
  }),
);
app.use(express.json());

async function ensureUniqueSlug(userId: string, base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.chat.findUnique({
      where: { userId_slug: { userId, slug: candidate } },
    });
    if (!existing) return candidate;
    suffix += 1;
  }
}

// Sync user after OAuth (same as middleware upsert, for explicit client call)
app.post("/signup", middleware, async (req: Request, res: Response) => {
  res.json({
    id: req.userId,
    email: req.userEmail,
    name: req.userName,
    provider: req.userProvider,
  });
});

app.post("/signin", middleware, async (req: Request, res: Response) => {
  res.json({
    id: req.userId,
    email: req.userEmail,
    name: req.userName,
    provider: req.userProvider,
  });
});

app.get("/chats", middleware, async (req: Request, res: Response) => {
  const chats = await prisma.chat.findMany({
    where: { userId: req.userId! },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  res.json({ chats });
});

app.get("/chats/:chatId", middleware, async (req: Request, res: Response) => {
  const chatId = String(req.params.chatId);
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: req.userId! },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }
  res.json({ chat });
});

app.post("/perplexity_ask", middleware, async (req: Request, res: Response) => {
  const query = req.body?.query;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Missing or invalid 'query'" });
    return;
  }

  const userId = req.userId!;
  let chatId = req.body?.chatId as string | undefined;

  if (chatId) {
    const existing = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
  } else {
    const slug = await ensureUniqueSlug(userId, query);
    const chat = await prisma.chat.create({
      data: {
        userId,
        slug,
        title: query.slice(0, 80),
      },
    });
    chatId = chat.id;
  }

  await prisma.chatMessage.create({
    data: { chatId, content: query, role: MessageRole.User },
  });

  const webSearchResponse = await tavilyClient.search(query, tavilySearchOptions);
  const webSearchResults = webSearchResponse.results;
  const sources = buildSourcesFromTavily(webSearchResponse);

  const prompt = PROMPT_TEMPLATE.replace(
    "{{WEB_SEARCH_RESULTS}}",
    JSON.stringify(webSearchResults),
  ).replace("{{USER_QUERY}}", query);

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Chat-Id", chatId);

  res.write(SOURCES_MARKER);
  res.write(JSON.stringify(sources));
  res.write(STREAM_DELIMITER);

  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    prompt,
    system: SYSTEM_PROMPT,
  });

  let fullText = "";
  for await (const textPart of result.textStream) {
    fullText += textPart;
    res.write(textPart);
  }

  const { answer, followUps } = parseStructuredResponse(fullText);
  await prisma.chatMessage.create({
    data: {
      chatId,
      content: serializeAssistantMessage({
        answer: answer || fullText,
        sources,
        followUps,
      }),
      role: MessageRole.Assistant,
    },
  });
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  res.end();
});

app.post("/perplexity_ask_follow_ups", middleware, async (req: Request, res: Response) => {
  const query = req.body?.query;
  const chatId = req.body?.chatId;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Missing or invalid 'query'" });
    return;
  }
  if (!chatId || typeof chatId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'chatId'" });
    return;
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: req.userId! },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  await prisma.chatMessage.create({
    data: { chatId, content: query, role: MessageRole.User },
  });

  const webSearchResponse = await tavilyClient.search(query, tavilySearchOptions);
  const webSearchResults = webSearchResponse.results;
  const sources = buildSourcesFromTavily(webSearchResponse);

  const prompt = buildHistoryPrompt(
    chat.messages.map((m) => ({
      role: m.role === MessageRole.User ? "User" : "Assistant",
      content:
        m.role === MessageRole.Assistant
          ? assistantAnswerOnly(m.content)
          : m.content,
    })),
    webSearchResults,
    query,
  );

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Chat-Id", chatId);

  res.write(SOURCES_MARKER);
  res.write(JSON.stringify(sources));
  res.write(STREAM_DELIMITER);

  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    prompt,
    system: SYSTEM_PROMPT,
  });

  let fullText = "";
  for await (const textPart of result.textStream) {
    fullText += textPart;
    res.write(textPart);
  }

  const { answer, followUps } = parseStructuredResponse(fullText);
  await prisma.chatMessage.create({
    data: {
      chatId,
      content: serializeAssistantMessage({
        answer: answer || fullText,
        sources,
        followUps,
      }),
      role: MessageRole.Assistant,
    },
  });
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  res.end();
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
