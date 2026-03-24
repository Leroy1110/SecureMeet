import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  type JsonRecord,
  extractUserLabel,
  extractUserList,
  isJsonRecord,
  parseNullableInteger,
  parsePositiveInteger,
  pickString,
  readString,
} from "../lib/roomMessageParsers";
import { getRoomSessionToken, readUserIdFromToken } from "../lib/roomSession";
import { buildRoomSocketUrl } from "../lib/roomSocket";

type ConnectionStatus = "connecting" | "open" | "connected" | "closed" | "error";
type SessionStatus = "unknown" | "waiting" | "active" | "rejected" | "kicked" | "disconnected" | "error";
type StatusTone = "neutral" | "success" | "warning" | "danger";
type HostMemberActionType = "waiting.approve" | "waiting.reject" | "member.kick";
type OutgoingMessageType = HostMemberActionType | "chat.send";
type ChatMessage = {
  room_code: string;
  from_user_id: number | null;
  to_user_id: number | null;
  content: string;
  created_at: string;
};

const FINAL_SESSION_STATUSES: SessionStatus[] = ["rejected", "kicked", "disconnected", "error"];

const addUser = (previousUsers: string[], user: string): string[] => {
  if (!user) {
    return previousUsers;
  }

  if (previousUsers.includes(user)) {
    return previousUsers;
  }

  return [...previousUsers, user];
};

const removeUser = (previousUsers: string[], user: string): string[] =>
  previousUsers.filter((existingUser) => existingUser !== user);

const getSessionStateContent = (
  status: SessionStatus,
  fallbackError: string
): { title: string; description: string; tone: StatusTone } => {
  switch (status) {
    case "waiting":
      return {
        title: "Waiting for host approval",
        description: "A host must approve your access before you can join this meeting.",
        tone: "neutral",
      };
    case "active":
      return {
        title: "You are in the room",
        description: "Your session is active and connected to this SecureMeet room.",
        tone: "success",
      };
    case "rejected":
      return {
        title: "Access rejected",
        description: "Your join request was declined by the host.",
        tone: "danger",
      };
    case "kicked":
      return {
        title: "Removed from room",
        description: "Your session was removed by the host.",
        tone: "danger",
      };
    case "disconnected":
      return {
        title: "Session disconnected",
        description: "This session ended or was replaced by another connection.",
        tone: "warning",
      };
    case "error":
      return {
        title: "Connection error",
        description: fallbackError || "Something went wrong while maintaining your room session.",
        tone: "danger",
      };
    case "unknown":
    default:
      return {
        title: "Connecting to room",
        description: "We are establishing your SecureMeet room session.",
        tone: "neutral",
      };
  }
};

const formatStatusLabel = (value: string): string =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getToneClasses = (tone: StatusTone): { card: string; badge: string } => {
  if (tone === "success") {
    return {
      card: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }

  if (tone === "warning") {
    return {
      card: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30",
      badge: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300",
    };
  }

  if (tone === "danger") {
    return {
      card: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30",
      badge: "border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300",
    };
  }

  return {
    card: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
};

function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const roomToken = getRoomSessionToken();
  const normalizedRoomCode = roomCode?.trim() ?? "";
  const hasPrerequisites = Boolean(normalizedRoomCode && roomToken);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("closed");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("unknown");
  const [role, setRole] = useState("");
  const [roomState, setRoomState] = useState("");
  const [waitingUsers, setWaitingUsers] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [lastMessageType, setLastMessageType] = useState("");
  const [lastError, setLastError] = useState("");
  const [hostActionError, setHostActionError] = useState("");
  const [hostActionPendingKey, setHostActionPendingKey] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [localUserId, setLocalUserId] = useState<number | null>(() => readUserIdFromToken(roomToken));
  const socketRef = useRef<WebSocket | null>(null);
  const lastOutgoingMessageTypeRef = useRef<OutgoingMessageType | null>(null);
  const socketConfig = useMemo(() => {
    if (!hasPrerequisites) {
      return { url: "", error: "" };
    }

    return buildRoomSocketUrl(normalizedRoomCode, roomToken);
  }, [hasPrerequisites, normalizedRoomCode, roomToken]);
  const displayedError = socketConfig.error || lastError;

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

  const sendHostMemberAction = (messageType: HostMemberActionType, userLabel: string) => {
    if (role !== "host") {
      setHostActionError("Only the host can manage room members.");
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setHostActionError("Cannot send action while room socket is not connected.");
      return;
    }

    const userId = parsePositiveInteger(userLabel);
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

  const sendHostWaitingAction = (messageType: "waiting.approve" | "waiting.reject", userLabel: string) => {
    sendHostMemberAction(messageType, userLabel);
  };

  const sendHostKickAction = (userLabel: string) => {
    sendHostMemberAction("member.kick", userLabel);
  };

  const canSendChat = sessionStatus === "active" || role === "host";
  const isSocketOpen = connectionStatus === "open" || connectionStatus === "connected";

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
            to_user_id: null,
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

      const resolveList = (record: JsonRecord, keys: string[]): string[] => {
        for (const key of keys) {
          const users = extractUserList(record[key]);
          if (users.length > 0 || Array.isArray(record[key])) {
            return users;
          }
        }

        return [];
      };

      const resolveSingleUser = (record: JsonRecord): string => {
        const direct = extractUserLabel(record.user);
        if (direct) {
          return direct;
        }

        const nested = extractUserLabel(record.user_id) || extractUserLabel(record.username);
        if (nested) {
          return nested;
        }

        return extractUserLabel(record);
      };

      switch (messageType) {
        case "system.connected": {
          setConnectionStatus("connected");
          lastOutgoingMessageTypeRef.current = null;
          if (isJsonRecord(payloadValue)) {
            const connectedUserId =
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
            to_user_id: parseNullableInteger(payloadValue.to_user_id),
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
      socketRef.current = null;
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
    };
  }, [hasPrerequisites, socketConfig.error, socketConfig.url]);

  const transportStatus = socketConfig.error ? "error" : connectionStatus;
  const stateContent = getSessionStateContent(sessionStatus, displayedError);
  const toneClasses = getToneClasses(stateContent.tone);
  const isFinalState = FINAL_SESSION_STATUSES.includes(sessionStatus);
  const isHost = role === "host";

  if (!hasPrerequisites) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Meeting Room</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              We could not initialize your room session.
            </p>
          </header>

          <section className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Cannot open room connection.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-300">
              {prerequisiteErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Meeting Room</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            SecureMeet room access and real-time session status.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room code</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{normalizedRoomCode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Connection</p>
              <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {formatStatusLabel(transportStatus)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
              <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {role ? formatStatusLabel(role) : "Unknown"}
              </span>
            </div>
          </div>
        </section>

        <section className={`rounded-xl border p-6 shadow-sm ${toneClasses.card}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Session status</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{stateContent.title}</h2>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{stateContent.description}</p>
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.badge}`}>
              {formatStatusLabel(sessionStatus)}
            </span>
          </div>

          {displayedError && sessionStatus !== "error" ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {displayedError}
            </p>
          ) : null}

          {isFinalState ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                Return to dashboard
              </button>
            </div>
          ) : null}
        </section>

        {isHost ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Waiting for approval</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Review join requests and approve or reject users.
                </p>
              </div>

              {hostActionError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  {hostActionError}
                </p>
              ) : null}

              {waitingUsers.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No users are waiting right now.</p>
              ) : (
                <ul className="space-y-2">
                  {waitingUsers.map((userLabel) => {
                    const approveKey = `waiting.approve:${userLabel}`;
                    const rejectKey = `waiting.reject:${userLabel}`;

                    return (
                      <li
                        key={userLabel}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => sendHostWaitingAction("waiting.approve", userLabel)}
                            disabled={hostActionPendingKey === approveKey}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => sendHostWaitingAction("waiting.reject", userLabel)}
                            disabled={hostActionPendingKey === rejectKey}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Active users</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Active participants currently connected to this room.
                </p>

                {activeUsers.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No active users yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {activeUsers.map((userLabel) => {
                      const userId = parsePositiveInteger(userLabel);
                      const kickKey = userId ? `member.kick:${userId}` : "";
                      const isLocalHost = localUserId !== null && userId === localUserId;
                      const canKick = Boolean(userId) && !isLocalHost;

                      return (
                        <li
                          key={userLabel}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800"
                        >
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                          {canKick ? (
                            <button
                              type="button"
                              onClick={() => sendHostKickAction(userLabel)}
                              disabled={hostActionPendingKey === kickKey}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                            >
                              Kick
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Chat</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Public room messages for active participants and host.
              </p>
            </div>

            {chatError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {chatError}
              </p>
            ) : null}

            {!canSendChat ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                Chat sending is available only after you become active in the room.
              </p>
            ) : null}

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No messages yet.</p>
              ) : (
                <ul className="space-y-2">
                  {chatMessages.map((message, index) => (
                    <li
                      key={`${message.from_user_id ?? "unknown"}:${message.created_at}:${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        User {message.from_user_id ?? "Unknown"}
                        {message.created_at ? ` • ${message.created_at}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-slate-800 dark:text-slate-100">
                        {message.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={sendChatMessage} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                disabled={!canSendChat || !isSocketOpen}
                placeholder={canSendChat ? "Type a message" : "You can chat once your session is active"}
                className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
              />
              <button
                type="submit"
                disabled={!canSendChat || !isSocketOpen}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Debug details</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Waiting users ({waitingUsers.length})
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{waitingUsers.join(", ") || "None"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active users ({activeUsers.length})
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{activeUsers.join(", ") || "None"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Last message type</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{lastMessageType || "None"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room state</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{roomState || "Unknown"}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RoomPage;
