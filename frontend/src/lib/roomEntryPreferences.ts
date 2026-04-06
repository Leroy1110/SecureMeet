type RoomEntryPreferencesRecord = {
  roomCode: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  updatedAt: string;
};

export type RoomEntryPreferences = {
  roomCode: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  updatedAt: string;
};

const ROOM_ENTRY_PREFERENCES_KEY = "securemeet_room_entry_preferences";

const isRoomEntryPreferencesRecord = (value: unknown): value is RoomEntryPreferencesRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.roomCode === "string" &&
    typeof record.displayName === "string" &&
    typeof record.audioEnabled === "boolean" &&
    typeof record.videoEnabled === "boolean" &&
    typeof record.updatedAt === "string"
  );
};

export const saveRoomEntryPreferences = (params: {
  roomCode: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}): void => {
  const normalizedRoomCode = params.roomCode.trim();
  if (!normalizedRoomCode) {
    return;
  }

  const payload: RoomEntryPreferencesRecord = {
    roomCode: normalizedRoomCode,
    displayName: params.displayName.trim(),
    audioEnabled: params.audioEnabled,
    videoEnabled: params.videoEnabled,
    updatedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(ROOM_ENTRY_PREFERENCES_KEY, JSON.stringify(payload));
};

export const getRoomEntryPreferences = (roomCode?: string): RoomEntryPreferences | null => {
  const rawValue = sessionStorage.getItem(ROOM_ENTRY_PREFERENCES_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRoomEntryPreferencesRecord(parsed)) {
      return null;
    }

    if (roomCode && parsed.roomCode !== roomCode.trim()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const clearRoomEntryPreferences = (): void => {
  sessionStorage.removeItem(ROOM_ENTRY_PREFERENCES_KEY);
};
