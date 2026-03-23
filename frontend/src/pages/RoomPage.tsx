import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROOM_SESSION_TOKEN_KEY } from "../lib/roomSession";

type ConnectionStatus = "connecting" | "connected" | "closed" | "error";
type JsonRecord = Record<string, unknown>;

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string => (typeof value === "string" ? value : "");

const pickString = (record: JsonRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
};

const extractUserLabel = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (!isJsonRecord(value)) {
    return "";
  }

  return pickString(value, ["username", "user_id", "id", "name"]);
};

const extractUserList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const users = value
    .map((item) => extractUserLabel(item))
    .filter((item) => Boolean(item.trim()));

  return Array.from(new Set(users));
};

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

const buildRoomSocketUrl = (roomCode: string, roomToken: string): { url: string; error: string } => {
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

function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const roomToken = localStorage.getItem(ROOM_SESSION_TOKEN_KEY)?.trim() ?? "";
  const normalizedRoomCode = roomCode?.trim() ?? "";
  const hasPrerequisites = Boolean(normalizedRoomCode && roomToken);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("closed");
  const [role, setRole] = useState("");
  const [roomState, setRoomState] = useState("");
  const [waitingUsers, setWaitingUsers] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [lastMessageType, setLastMessageType] = useState("");
  const [lastError, setLastError] = useState("");

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

  useEffect(() => {
    if (!hasPrerequisites) {
      return;
    }

    const { url, error } = buildRoomSocketUrl(normalizedRoomCode, roomToken);

    if (error) {
      setLastError(error);
      return;
    }

    setConnectionStatus("connecting");
    setLastError("");

    const socket = new WebSocket(url);
    let hadSocketError = false;

    const applyCommonState = (record: JsonRecord) => {
      const incomingRole = pickString(record, ["role"]);
      if (incomingRole) {
        setRole(incomingRole);
      }

      const incomingRoomState = pickString(record, ["room_state", "roomState", "state"]);
      if (incomingRoomState) {
        setRoomState(incomingRoomState);
      }
    };

    socket.onopen = () => {
      setConnectionStatus("connected");
    };

    socket.onclose = () => {
      if (!hadSocketError) {
        setConnectionStatus("closed");
      }
    };

    socket.onerror = () => {
      hadSocketError = true;
      setConnectionStatus("error");
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
      } catch (error) {
        console.error("Failed to parse WebSocket message", error);
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
          if (isJsonRecord(payloadValue)) {
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
          if (isJsonRecord(payloadValue)) {
            const user = resolveSingleUser(payloadValue);
            setWaitingUsers((previousUsers) => removeUser(previousUsers, user));
            setActiveUsers((previousUsers) => addUser(previousUsers, user));
          }
          break;
        }
        case "waiting.rejected": {
          if (isJsonRecord(payloadValue)) {
            const user = resolveSingleUser(payloadValue);
            setWaitingUsers((previousUsers) => removeUser(previousUsers, user));
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
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error"])
            : "";
          setLastError(message || "You were removed from this room.");
          socket.close();
          break;
        }
        case "error": {
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error"])
            : "";
          setLastError(message || "Room WebSocket error message received.");
          break;
        }
        default:
          break;
      }
    };

    return () => {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
    };
  }, [hasPrerequisites, normalizedRoomCode, roomToken]);

  if (!hasPrerequisites) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Room Page</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Cannot open room connection.</p>
          <ul className="mt-2 list-disc pl-5">
            {prerequisiteErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Room Debug View</h1>
      <p>
        <strong>Room Code:</strong> {normalizedRoomCode}
      </p>
      <p>
        <strong>Connection Status:</strong> {connectionStatus}
      </p>
      <p>
        <strong>Role:</strong> {role || "Unknown"}
      </p>
      <p>
        <strong>Room State:</strong> {roomState || "Unknown"}
      </p>
      <p>
        <strong>Waiting Users ({waitingUsers.length}):</strong> {waitingUsers.join(", ") || "None"}
      </p>
      <p>
        <strong>Active Users ({activeUsers.length}):</strong> {activeUsers.join(", ") || "None"}
      </p>
      <p>
        <strong>Last Message Type:</strong> {lastMessageType || "None"}
      </p>
      {lastError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <strong>Last Error:</strong> {lastError}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Back to dashboard
      </button>
    </div>
  );
}

export default RoomPage;
