import { readString } from "./roomMessageParsers";

export const buildRoomSocketUrl = (roomCode: string, roomToken: string): { url: string; error: string } => {
  const apiBase = readString(import.meta.env.VITE_API_URL).trim();

  if (!apiBase) {
    return { url: "", error: "Missing VITE_API_URL environment variable." };
  }

  let wsBase = "";

  if (apiBase.startsWith("https://")) {
    wsBase = `wss://${apiBase.slice("https://".length)}`;
  } else if (apiBase.startsWith("http://")) {
    wsBase = `ws://${apiBase.slice("http://".length)}`;
  } else {
    return { url: "", error: "VITE_API_URL must start with http:// or https://" };
  }

  const normalizedBase = wsBase.replace(/\/+$/, "");
  const url = `${normalizedBase}/ws/rooms/${encodeURIComponent(roomCode)}?token=${encodeURIComponent(roomToken)}`;

  return { url, error: "" };
};
