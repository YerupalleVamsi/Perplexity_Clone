import { serve } from "bun";
import index from "./index.html";

const serveOptions = {
  routes: {
    "/*": index,

    "/api/hello": {
      async GET() {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT() {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req: { params: { name: string } }) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
} as const;

function startServer() {
  const basePort = Number(process.env.PORT) || 5174;
  const portsToTry =
    basePort === 0
      ? [0]
      : [basePort, ...Array.from({ length: 10 }, (_, i) => basePort + i + 1)];

  for (const port of portsToTry) {
    try {
      return serve({ ...serveOptions, port });
    } catch (error) {
      const errno = (error as NodeJS.ErrnoException).code;
      if (errno !== "EADDRINUSE") throw error;
    }
  }

  throw new Error(
    `No free port found (tried ${basePort}-${basePort + 10}). Stop the other dev server or set PORT.`,
  );
}

const server = startServer();
console.log(`Server running at ${server.url}`);
