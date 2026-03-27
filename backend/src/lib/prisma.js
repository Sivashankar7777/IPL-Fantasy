import { PrismaClient } from "@prisma/client";

const BACKEND_DIR_URL = new URL("../../", import.meta.url);

function resolveDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!rawUrl) return undefined;

  if (rawUrl.startsWith("file:./") || rawUrl.startsWith("file:../")) {
    return new URL(rawUrl.slice("file:".length), BACKEND_DIR_URL).href;
  }

  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export const prisma = globalThis.__prisma__ || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}
