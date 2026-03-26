import { type Dispatch, type FormEvent, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type JsonRecord,
  isJsonRecord,
  parseNullableInteger,
  parsePositiveInteger,
  pickString,
  readString,
} from "../lib/roomMessageParsers";
import { clearRoomSessionToken, getRoomSessionToken, readUserIdFromToken } from "../lib/roomSession";
import { buildRoomSocketUrl } from "../lib/roomSocket";

export type ConnectionStatus = "connecting" | "open" | "connected" | "closed" | "error";
export type SessionStatus = "unknown" | "waiting" | "active" | "rejected" | "kicked" | "disconnected" | "error";
export type HostMemberActionType = "waiting.approve" | "waiting.reject" | "member.kick";
export type OutgoingMessageType = HostMemberActionType | "chat.send";

export type RoomPresenceUser = {
  userId: number | null;
  label: string;
};

export type ChatMessage = {
  room_code: string;
  from_user_id: number | null;
  from_display_name: string;
  to_user_id: number | null;
  to_display_name: string;
  content: string;
  created_at: string;
};

export type ChatRecipientOption = {
  userId: number;
  label: string;
};

export type UseRoomSocketParams = {
  roomCode?: string;
};

export type UseRoomSocketResult = {
  connectionStatus: ConnectionStatus;
  sessionStatus: SessionStatus;
  role: string;
  roomState: string;
  waitingUsers: RoomPresenceUser[];
  activeUsers: RoomPresenceUser[];
  lastMessageType: string;
  lastError: string;
  hostActionError: string;
  hostActionPendingKey: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  chatError: string;
  selectedRecipientUserId: number | null;
  chatRecipientOptions: ChatRecipientOption[];
  localUserId: number | null;
  hasPrerequisites: boolean;
  normalizedRoomCode: string;
  prerequisiteErrors: string[];
  displayedError: string;
  canSendChat: boolean;
  isSocketOpen: boolean;
  isHost: boolean;
  isFinalState: boolean;
  transportStatus: ConnectionStatus;
  setChatInput: Dispatch<SetStateAction<string>>;
  setSelectedRecipientUserId: Dispatch<SetStateAction<number | null>>;
  setSelectedRecipientFromValue: (value: string) => void;
  sendHostWaitingAction: (messageType: "waiting.approve" | "waiting.reject", userId: number | null) => void;
  sendHostKickAction: (userId: number | null) => void;
  sendChatMessage: (event: FormEvent<HTMLFormElement>) => void;
  leaveRoom: () => void;
};

const FINAL_SESSION_STATUSES: SessionStatus[] = ["rejected", "kicked", "disconnected", "error"];

const buildUserLabel = (userId: number | null, label: string): string => {
  const trimmedLabel = label.trim();
  if (trimmedLabel) {
    return trimmedLabel;
  }

  if (userId !== null) {
    return `User ${userId}`;
  }

  return "";
};

const getRoomPresenceUserKey = (user: RoomPresenceUser): string =>
  user.userId !== null ? `id:${user.userId}` : `label:${user.label.toLowerCase()}`;

const extractPresenceUser = (value: unknown): RoomPresenceUser | null => {
  if (typeof value === "number") {
    const userId = parsePositiveInteger(value);
    if (!userId) {
      return null;
    }

    return {
      userId,
      label: buildUserLabel(userId, ""),
    };
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    const userId = parsePositiveInteger(trimmedValue);
    return {
      userId: userId ?? null,
      label: buildUserLabel(userId ?? null, trimmedValue),
    };
  }

  if (!isJsonRecord(value)) {
    return null;
  }

  const userId =
    parsePositiveInteger(value.user_id) ??
    parsePositiveInteger(value.userId) ??
    parsePositiveInteger(value.id);

  const label = pickString(value, [
    "display_name",
    "displayName",
    "nickname",
    "username",
    "name",
    "label",
  ]);

  const resolvedLabel = buildUserLabel(userId, label);
  if (!resolvedLabel) {
    return null;
  }

  return {
    userId: userId ?? null,
    label: resolvedLabel,
  };
};

const extractPresenceUsers = (value: unknown): RoomPresenceUser[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const usersByKey = new Map<string, RoomPresenceUser>();
  for (const item of value) {
    const user = extractPresenceUser(item);
    if (!user) {
      continue;
    }

    const key = getRoomPresenceUserKey(user);
    if (!usersByKey.has(key)) {
      usersByKey.set(key, user);
    }
  }

  return Array.from(usersByKey.values());
};

const addUser = (previousUsers: RoomPresenceUser[], user: RoomPresenceUser | null): RoomPresenceUser[] => {
  if (!user) {
    return previousUsers;
  }

  const key = getRoomPresenceUserKey(user);
  if (previousUsers.some((existingUser) => getRoomPresenceUserKey(existingUser) === key)) {
    return previousUsers;
  }

  return [...previousUsers, user];
};

const removeUser = (
  previousUsers: RoomPresenceUser[],
  userToRemove: RoomPresenceUser | null
): RoomPresenceUser[] => {
  if (!userToRemove) {
    return previousUsers;
  }

  if (userToRemove.userId !== null) {
    return previousUsers.filter((existingUser) => existingUser.userId !== userToRemove.userId);
  }

  return previousUsers.filter(
    (existingUser) => existingUser.label.toLowerCase() !== userToRemove.label.toLowerCase()
  );
};

export const useRoomSocket = ({ roomCode }: UseRoomSocketParams): UseRoomSocketResult => {
  const [roomToken, setRoomToken] = useState(() => getRoomSessionToken());
  const normalizedRoomCode = roomCode?.trim() ?? "";
  const hasPrerequisites = Boolean(normalizedRoomCode && roomToken);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("closed");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("unknown");
  const [role, setRole] = useState("");
  const [roomState, setRoomState] = useState("");
  const [waitingUsers, setWaitingUsers] = useState<RoomPresenceUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<RoomPresenceUser[]>([]);
  const [lastMessageType, setLastMessageType] = useState("");
  const [lastError, setLastError] = useState("");
  const [hostActionError, setHostActionError] = useState("");
  const [hostActionPendingKey, setHostActionPendingKey] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [selectedRecipientUserId, setSelectedRecipientUserId] = useState<number | null>(null);
  const [localUserId, setLocalUserId] = useState<number | null>(() => readUserIdFromToken(roomToken));
  const socketRef = useRef<WebSocket | null>(null);
  const lastOutgoingMessageTypeRef = useRef<OutgoingMessageType | null>(null);

  const resetRoomLocalState = useCallback(() => {
    setConnectionStatus("closed");
    setSessionStatus("unknown");
    setRole("");
    setRoomState("");
    setWaitingUsers([]);
    setActiveUsers([]);
    setLastMessageType("");
    setLastError("");
    setHostActionError("");
    setHostActionPendingKey("");
    setChatMessages([]);
    setChatInput("");
    setChatError("");
    setSelectedRecipientUserId(null);
    setLocalUserId(null);
  }, []);

  const closeSocketConnection = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;

    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      try {
        socket.close();
      } catch (error){
        console.error("Failed to close room socket during leave/cleanup.", error);
      }
    }
  }, []);

  const leaveRoom = useCallback(() => {
    lastOutgoingMessageTypeRef.current = null;
    closeSocketConnection();
    clearRoomSessionToken();
    setRoomToken("");
    resetRoomLocalState();
  }, [closeSocketConnection, resetRoomLocalState]);

  const clearPersistedRoomSession = useCallback(() => {
    clearRoomSessionToken();
    setRoomToken("");
  }, []);

  const socketConfig = useMemo(() => {
    if (!hasPrerequisites) {
      return { url: "", error: "" };
    }

    return buildRoomSocketUrl(normalizedRoomCode, roomToken);
  }, [hasPrerequisites, normalizedRoomCode, roomToken]);

  const prerequisiteErrors = useMemo(() => {
    const errors: string[] = [];

    if (!normalizedRoomCode) {
      errors.push("Missing room code in route.");
    }

    if (!roomToken) {
      errors.push("Missing room session token.");
    }

    return errors;
  }, [normalizedRoomCode, roomToken]);

  const sendHostMemberAction = (messageType: HostMemberActionType, userId: number | null) => {
    if (role !== "host") {
      setHostActionError("Only the host can manage room members.");
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setHostActionError("Cannot send action while room socket is not connected.");
      return;
    }

    if (!userId) {
      if (messageType === "member.kick") {
        setHostActionError("Cannot kick: invalid user id.");
      } else {
        setHostActionError(`Cannot ${messageType === "waiting.approve" ? "approve" : "reject"}: invalid user id.`);
      }
      return;
    }

    if (messageType === "member.kick" && localUserId !== null && userId === localUserId) {
      setHostActionError("You cannot kick your own host session.");
      return;
    }

    setHostActionError("");
    const actionKey = `${messageType}:${userId}`;
    setHostActionPendingKey(actionKey);
    lastOutgoingMessageTypeRef.current = messageType;

    try {
      socket.send(
        JSON.stringify({
          type: messageType,
          payload: {
            user_id: userId,
          },
        })
      );
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      if (messageType === "member.kick") {
        setHostActionError("Failed to kick active user.");
      } else {
        setHostActionError(`Failed to ${messageType === "waiting.approve" ? "approve" : "reject"} waiting user.`);
      }
    } finally {
      setHostActionPendingKey("");
    }
  };

  const sendHostWaitingAction = (messageType: "waiting.approve" | "waiting.reject", userId: number | null) => {
    sendHostMemberAction(messageType, userId);
  };

  const sendHostKickAction = (userId: number | null) => {
    sendHostMemberAction("member.kick", userId);
  };

  const canSendChat = sessionStatus === "active" || role === "host";
  const isSocketOpen = connectionStatus === "open" || connectionStatus === "connected";
  const chatRecipientOptions = useMemo<ChatRecipientOption[]>(() => {
    const optionsByUserId = new Map<number, ChatRecipientOption>();

    for (const user of activeUsers) {
      const userId = user.userId;
      if (!userId) {
        continue;
      }

      if (localUserId !== null && userId === localUserId) {
        continue;
      }

      if (!optionsByUserId.has(userId)) {
        optionsByUserId.set(userId, {
          userId,
          label: user.label,
        });
      }
    }

    return Array.from(optionsByUserId.values()).sort((left, right) => left.userId - right.userId);
  }, [activeUsers, localUserId]);

  const setSelectedRecipientFromValue = (value: string) => {
    if (value === "public") {
      setSelectedRecipientUserId(null);
      return;
    }

    const parsedUserId = parsePositiveInteger(value);
    if (!parsedUserId || !chatRecipientOptions.some((option) => option.userId === parsedUserId)) {
      setSelectedRecipientUserId(null);
      return;
    }

    setSelectedRecipientUserId(parsedUserId);
  };

  useEffect(() => {
    if (selectedRecipientUserId === null) {
      return;
    }

    const stillValid = chatRecipientOptions.some((option) => option.userId === selectedRecipientUserId);
    if (!stillValid) {
      setSelectedRecipientUserId(null);
    }
  }, [chatRecipientOptions, selectedRecipientUserId]);

  const sendChatMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChatError("");

    if (!canSendChat) {
      setChatError("Only host or active users can send chat messages.");
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !isSocketOpen) {
      setChatError("Cannot send message while room socket is not connected.");
      return;
    }

    const content = chatInput.trim();
    if (!content) {
      setChatError("Enter a message before sending.");
      return;
    }

    try {
      lastOutgoingMessageTypeRef.current = "chat.send";
      socket.send(
        JSON.stringify({
          type: "chat.send",
          payload: {
            content,
            to_user_id: selectedRecipientUserId,
          },
        })
      );
      setChatInput("");
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      setChatError("Failed to send chat message.");
    }
  };

  useEffect(() => {
    if (!hasPrerequisites) {
      return;
    }

    if (socketConfig.error) {
      return;
    }

    setConnectionStatus("connecting");
    setSessionStatus("unknown");
    setLastError("");
    setHostActionError("");
    setHostActionPendingKey("");
    setChatError("");

    const socket = new WebSocket(socketConfig.url);
    socketRef.current = socket;
    let hadSocketError = false;

    const applyCommonState = (record: JsonRecord) => {
      const incomingRole = pickString(record, ["role"]);
      if (incomingRole) {
        setRole(incomingRole);
      }

      const incomingRoomState = pickString(record, ["room_state", "roomState", "state"]);
      if (incomingRoomState) {
        setRoomState(incomingRoomState);
        if (incomingRoomState === "active") {
          setSessionStatus("active");
        } else if (incomingRoomState === "waiting") {
          setSessionStatus("waiting");
        } else if (incomingRoomState === "rejected") {
          setSessionStatus("rejected");
        }
      }
    };

    socket.onopen = () => {
      setConnectionStatus("open");
      setLastError("");
    };

    socket.onclose = () => {
      if (!hadSocketError) {
        setConnectionStatus("closed");
      }
    };

    socket.onerror = () => {
      hadSocketError = true;
      setConnectionStatus("error");
      setSessionStatus("error");
      setLastError("WebSocket connection error.");
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== "string") {
        setLastError("Received non-text WebSocket message.");
        return;
      }

      let parsedMessage: unknown;

      try {
        parsedMessage = JSON.parse(event.data);
      } catch {
        setLastError("Failed to parse WebSocket message.");
        return;
      }

      if (!isJsonRecord(parsedMessage)) {
        setLastError("Received malformed WebSocket message.");
        return;
      }

      const messageType = pickString(parsedMessage, ["type", "event"]) || "unknown";
      setLastMessageType(messageType);

      const payloadValue = isJsonRecord(parsedMessage.payload)
        ? parsedMessage.payload
        : isJsonRecord(parsedMessage.data)
          ? parsedMessage.data
          : parsedMessage;

      applyCommonState(parsedMessage);
      if (isJsonRecord(payloadValue)) {
        applyCommonState(payloadValue);
      }

      const resolveList = (record: JsonRecord, keys: string[]): RoomPresenceUser[] => {
        for (const key of keys) {
          const users = extractPresenceUsers(record[key]);
          if (users.length > 0 || Array.isArray(record[key])) {
            return users;
          }
        }

        return [];
      };

      const resolveSingleUser = (record: JsonRecord): RoomPresenceUser | null => {
        const direct = extractPresenceUser(record.user);
        if (direct) {
          return direct;
        }

        const nested = extractPresenceUser(record.member);
        if (nested) {
          return nested;
        }

        return extractPresenceUser(record);
      };

      switch (messageType) {
        case "system.connected": {
          setConnectionStatus("connected");
          lastOutgoingMessageTypeRef.current = null;
          if (isJsonRecord(payloadValue)) {
            const connectedUser = extractPresenceUser(payloadValue.user);
            const connectedUserId =
              connectedUser?.userId ??
              parsePositiveInteger(payloadValue.user_id) ??
              parsePositiveInteger(payloadValue.userId) ??
              parsePositiveInteger(payloadValue.id);
            if (connectedUserId) {
              setLocalUserId((previousUserId) => previousUserId ?? connectedUserId);
            }
            const waiting = resolveList(payloadValue, ["waiting_users", "waiting", "users"]);
            const active = resolveList(payloadValue, ["active_users", "active", "users"]);
            setWaitingUsers(waiting);
            setActiveUsers(active);
          }
          break;
        }
        case "waiting.list": {
          if (isJsonRecord(payloadValue)) {
            setWaitingUsers(resolveList(payloadValue, ["waiting_users", "waiting", "users"]));
          }
          break;
        }
        case "active.list": {
          if (isJsonRecord(payloadValue)) {
            setActiveUsers(resolveList(payloadValue, ["active_users", "active", "users"]));
          }
          break;
        }
        case "waiting.add": {
          if (isJsonRecord(payloadValue)) {
            const user = resolveSingleUser(payloadValue);
            setWaitingUsers((previousUsers) => addUser(previousUsers, user));
          }
          break;
        }
        case "waiting.approved": {
          lastOutgoingMessageTypeRef.current = null;
          setRoomState("active");
          setSessionStatus("active");
          setLastError("");
          break;
        }
        case "waiting.rejected": {
          lastOutgoingMessageTypeRef.current = null;
          clearPersistedRoomSession();
          setRoomState("rejected");
          setSessionStatus("rejected");
          setLastError("You were not admitted to this room.");
          break;
        }
        case "waiting.removed": {
          if (isJsonRecord(payloadValue)) {
            const waiting = resolveList(payloadValue, ["waiting_users", "waiting", "users"]);
            if (waiting.length > 0 || Array.isArray(payloadValue.waiting_users) || Array.isArray(payloadValue.waiting)) {
              setWaitingUsers(waiting);
            } else {
              const user = resolveSingleUser(payloadValue);
              setWaitingUsers((previousUsers) => removeUser(previousUsers, user));
            }
          }
          break;
        }
        case "active.add": {
          if (isJsonRecord(payloadValue)) {
            const user = resolveSingleUser(payloadValue);
            setActiveUsers((previousUsers) => addUser(previousUsers, user));
          }
          break;
        }
        case "active.remove": {
          if (isJsonRecord(payloadValue)) {
            const user = resolveSingleUser(payloadValue);
            setActiveUsers((previousUsers) => removeUser(previousUsers, user));
          }
          break;
        }
        case "system.kicked": {
          lastOutgoingMessageTypeRef.current = null;
          clearPersistedRoomSession();
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error"])
            : "";
          setSessionStatus("kicked");
          setLastError(message || "You were removed from this room.");
          socket.close();
          break;
        }
        case "system.disconnected": {
          lastOutgoingMessageTypeRef.current = null;
          clearPersistedRoomSession();
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error", "reason"])
            : "";
          setSessionStatus("disconnected");
          setRoomState("disconnected");
          setConnectionStatus("closed");
          setLastError(message || "This session was disconnected, likely replaced by a newer connection.");
          socket.close();
          break;
        }
        case "chat.message": {
          if (!isJsonRecord(payloadValue)) {
            break;
          }

          const content = readString(payloadValue.content);
          if (!content.trim()) {
            break;
          }

          const chatMessage: ChatMessage = {
            room_code: readString(payloadValue.room_code),
            from_user_id: parseNullableInteger(payloadValue.from_user_id),
            from_display_name: pickString(payloadValue, [
              "from_display_name",
              "fromDisplayName",
              "from_username",
              "fromUsername",
            ]),
            to_user_id: parseNullableInteger(payloadValue.to_user_id),
            to_display_name: pickString(payloadValue, [
              "to_display_name",
              "toDisplayName",
              "to_username",
              "toUsername",
            ]),
            content,
            created_at: readString(payloadValue.created_at),
          };

          setChatMessages((previousMessages) => [...previousMessages, chatMessage]);
          if (lastOutgoingMessageTypeRef.current === "chat.send") {
            setChatError("");
            lastOutgoingMessageTypeRef.current = null;
          }
          break;
        }
        case "error": {
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error"])
            : "";
          const normalizedMessage = message.toLowerCase();
          const isChatRelatedError =
            lastOutgoingMessageTypeRef.current === "chat.send" ||
            normalizedMessage.includes("chat") ||
            normalizedMessage.includes("content") ||
            normalizedMessage.includes("to_user_id") ||
            normalizedMessage.includes("only active users can send messages");

          if (isChatRelatedError) {
            setChatError(message || "Failed to send chat message.");
            lastOutgoingMessageTypeRef.current = null;
            break;
          }

          setSessionStatus("error");
          setLastError(message || "Room WebSocket error message received.");
          break;
        }
        default:
          break;
      }
    };

    return () => {
      closeSocketConnection();
    };
  }, [clearPersistedRoomSession, closeSocketConnection, hasPrerequisites, socketConfig.error, socketConfig.url]);

  const displayedError = socketConfig.error || lastError;
  const transportStatus = socketConfig.error ? "error" : connectionStatus;
  const isFinalState = FINAL_SESSION_STATUSES.includes(sessionStatus);
  const isHost = role === "host";

  return {
    connectionStatus,
    sessionStatus,
    role,
    roomState,
    waitingUsers,
    activeUsers,
    lastMessageType,
    lastError,
    hostActionError,
    hostActionPendingKey,
    chatMessages,
    chatInput,
    chatError,
    selectedRecipientUserId,
    chatRecipientOptions,
    localUserId,
    hasPrerequisites,
    normalizedRoomCode,
    prerequisiteErrors,
    displayedError,
    canSendChat,
    isSocketOpen,
    isHost,
    isFinalState,
    transportStatus,
    setChatInput,
    setSelectedRecipientUserId,
    setSelectedRecipientFromValue,
    sendHostWaitingAction,
    sendHostKickAction,
    sendChatMessage,
    leaveRoom,
  };
};
