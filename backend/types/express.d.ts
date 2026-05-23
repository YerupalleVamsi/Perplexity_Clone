import type { AuthProvider } from "../prisma/generated/enums";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userName?: string;
      userProvider?: AuthProvider;
    }
  }
}

export {};
