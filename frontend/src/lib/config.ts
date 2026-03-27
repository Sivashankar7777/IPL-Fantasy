const DEFAULT_BACKEND_PORT = "3001";
const DEFAULT_PROTOCOL = "http:";

function resolveBrowserBackendUrl() {
  if (typeof window === "undefined") {
    return `${DEFAULT_PROTOCOL}//localhost:${DEFAULT_BACKEND_PORT}`;
  }

  const protocol = window.location.protocol || DEFAULT_PROTOCOL;
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
}

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  resolveBrowserBackendUrl();

export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || BACKEND_URL;
