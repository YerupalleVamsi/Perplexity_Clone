import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";
import { AuthProvider } from "./prisma/generated/enums";

const supabase = createSupabaseClient();

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function mapProvider(raw: string | undefined): AuthProvider {
  if (raw === "google") return AuthProvider.Google;
  return AuthProvider.Github;
}

export async function middleware(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing Authorization: Bearer <token>" });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const authUser = data.user;
  const email = authUser.email;
  if (!email) {
    res.status(400).json({ error: "User email is required" });
    return;
  }

  const provider = mapProvider(authUser.app_metadata?.provider as string | undefined);
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    email.split("@")[0] ??
    "User";

  await prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email,
      provider,
      name,
    },
    update: {
      email,
      provider,
      name,
    },
  });

  req.userId = authUser.id;
  req.userEmail = email;
  req.userName = name;
  req.userProvider = provider;
  next();
}
