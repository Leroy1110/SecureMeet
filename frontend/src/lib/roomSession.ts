import { isJsonRecord, parsePositiveInteger } from "./roomMessageParsers";

export const ROOM_SESSION_TOKEN_KEY = "securemeet_room_session_token";

export const getRoomSessionToken = (): string =>
  localStorage.getItem(ROOM_SESSION_TOKEN_KEY)?.trim() ?? "";

export const setRoomSessionToken = (token: string): void => {
  localStorage.setItem(ROOM_SESSION_TOKEN_KEY, token);
};

export const clearRoomSessionToken = (): void => {
  localStorage.removeItem(ROOM_SESSION_TOKEN_KEY);
};

export const readUserIdFromToken = (token: string): number | null => {
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const payloadBase64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalizedPayload = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, "=");
    const decodedPayload = atob(normalizedPayload);
    const parsedPayload = JSON.parse(decodedPayload) as unknown;

    if (!isJsonRecord(parsedPayload)) {
      return null;
    }

    return (
      parsePositiveInteger(parsedPayload.user_id) ??
      parsePositiveInteger(parsedPayload.userId) ??
      parsePositiveInteger(parsedPayload.id) ??
      parsePositiveInteger(parsedPayload.sub)
    );
  } catch {
    return null;
  }
};
