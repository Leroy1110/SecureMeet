import { type Dispatch, type FormEvent, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type JsonRecord,
  isJsonRecord,
  parseNullableInteger,
  parsePositiveInteger,
  pickString,
  readString,
} from "../lib/roomMessageParsers";
import { clearRoomSessionToken, getRoomSessionToken, readUserIdFromToken, setRoomSessionToken, isRoomTokenExpired } from "../lib/roomSession";
import { buildRoomSocketUrl } from "../lib/roomSocket";

export type ConnectionStatus = "connecting" | "open" | "connected" | "closed" | "error";
export type SessionStatus = "unknown" | "waiting" | "active" | "rejected" | "kicked" | "disconnected" | "error";
export type HostMemberActionType = "waiting.approve" | "waiting.reject" | "member.kick";
export type WebRtcMessageType = "webrtc.offer" | "webrtc.answer" | "webrtc.ice_candidate";
export type OutgoingMessageType =
  | HostMemberActionType
  | "chat.send"
  | WebRtcMessageType
  | "room.leave"
  | "host.transfer"
  | "room.end"
  | "screen.share.start"
  | "screen.share.stop"
  | "host.screen.stop";
type PendingHostActionTargetScope = "waiting" | "active" | "either";
type PendingHostAction = {
  type: HostMemberActionType;
  userId: number;
  startedAt: number;
  expectedRemovalFrom: PendingHostActionTargetScope;
};

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

export type IncomingWebRtcSignal = {
  type: WebRtcMessageType;
  fromUserId: number;
  toUserId: number | null;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};

export type QueuedWebRtcSignal = IncomingWebRtcSignal & {
  queueId: number;
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
  hasHostActionPending: boolean;
  hostActionPendingKey: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  chatError: string;
  selectedRecipientUserId: number | null;
  chatRecipientOptions: ChatRecipientOption[];
  queuedWebRtcSignals: QueuedWebRtcSignal[];
  localUserId: number | null;
  screenSharerUserId: number | null;
  forceStopScreenShareNonce: number;
  hasPrerequisites: boolean;
  normalizedRoomCode: string;
  prerequisiteErrors: string[];
  displayedError: string;
  canSendChat: boolean;
  canSendWebRtc: boolean;
  isSocketOpen: boolean;
  isHost: boolean;
  isFinalState: boolean;
  transportStatus: ConnectionStatus;
  setChatInput: Dispatch<SetStateAction<string>>;
  setSelectedRecipientUserId: Dispatch<SetStateAction<number | null>>;
  setSelectedRecipientFromValue: (value: string) => void;
  sendHostWaitingAction: (messageType: "waiting.approve" | "waiting.reject", userId: number | null) => void;
  sendHostKickAction: (userId: number | null) => void;
  sendHostTransfer: (toUserId: number) => boolean;
  sendHostScreenStop: (userId: number) => boolean;
  sendEndMeeting: () => boolean;
  sendScreenShareStart: () => boolean;
  sendScreenShareStop: () => boolean;
  sendChatMessage: (event: FormEvent<HTMLFormElement>) => void;
  sendWebRtcOffer: (toUserId: number | null, sdp: string) => boolean;
  sendWebRtcAnswer: (toUserId: number | null, sdp: string) => boolean;
  sendWebRtcIceCandidate: (toUserId: number | null, candidate: RTCIceCandidateInit) => boolean;
  consumeWebRtcSignal: (queueId: number) => void;
  leaveRoom: () => void;
};

const FINAL_SESSION_STATUSES: SessionStatus[] = ["rejected", "kicked", "disconnected", "error"];
const EXPLICIT_LEAVE_CLOSE_DELAY_MS = 150;
const SOCKET_RECONNECT_DELAY_MS = 1_500;
const SOCKET_RECONNECT_GRACE_WINDOW_MS = 30_000;
const SOCKET_RECONNECT_STATUS_MESSAGE = "Connection interrupted. Reconnecting...";
const HOST_MODERATION_PENDING_TIMEOUT_MS = 8_000;
const HOST_MODERATION_ERROR_FRAGMENTS = [
  "only host can approve or reject",
  "only host can kick",
  "invalid user_id in payload",
  "user not in waiting",
  "failed to approve user",
  "failed to reject user",
  "failed to kick",
  "host cannot be kicked",
  "user not connected",
];
const HOST_CONTROL_ERROR_FRAGMENTS = [
  "only host can transfer host role",
  "cannot transfer host to yourself",
  "target user is not an active participant",
  "failed to persist host transfer",
  "host transfer failed after db update",
  "only host can end the meeting",
  "failed to end meeting",
];
const WEBRTC_ERROR_FRAGMENTS = [
  "only host or active users can send webrtc signaling",
  "cannot send webrtc signaling to yourself",
  "target user is not active",
  "failed to relay webrtc",
  "invalid sdp in payload",
  "invalid candidate",
  "only host or active users can start screen share",
  "only host or active users can stop screen share",
  "another user is currently sharing",
  "only host can stop another user's screen share",
  "target user is not currently sharing",
];
const CHAT_ERROR_FRAGMENTS = [
  "chat",
  "content",
  "content too long",
  "only active users can send messages",
  "to_user_id must be int or null",
  "user not active",
  "failed to persist chat message",
  "invalid persisted message metadata",
  "failed to send message to user",
];
const TERMINAL_CLOSE_REASON_FRAGMENTS = [
  "room is not active",
  "room has expired",
  "room member not found",
  "member state not allowed",
  "room not found",
  "unable to decode token",
  "invalid state",
  "invalid role",
  "missing token",
];

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
const isUserInPresenceList = (users: RoomPresenceUser[], userId: number): boolean =>
  users.some((user) => user.userId === userId);

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

const parseNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    if (Number.isInteger(parsedValue) && parsedValue >= 0) {
      return parsedValue;
    }
  }

  return null;
};

const extractRtcIceCandidate = (value: unknown): RTCIceCandidateInit | null => {
  if (!isJsonRecord(value)) {
    return null;
  }

  const candidateString = readString(value.candidate);
  if (!candidateString.trim()) {
    return null;
  }

  const sdpMidRaw = value.sdpMid;
  const usernameFragmentRaw = value.usernameFragment;

  return {
    candidate: candidateString,
    sdpMid: typeof sdpMidRaw === "string" ? sdpMidRaw : null,
    sdpMLineIndex: parseNonNegativeInteger(value.sdpMLineIndex),
    usernameFragment: typeof usernameFragmentRaw === "string" ? usernameFragmentRaw : null,
  };
};

const normalizeOutgoingRtcCandidate = (candidate: RTCIceCandidateInit): RTCIceCandidateInit | null => {
  const candidateString = readString(candidate.candidate);
  if (!candidateString.trim()) {
    return null;
  }

  return {
    candidate: candidateString,
    sdpMid: typeof candidate.sdpMid === "string" ? candidate.sdpMid : null,
    sdpMLineIndex: parseNonNegativeInteger(candidate.sdpMLineIndex),
    usernameFragment: typeof candidate.usernameFragment === "string" ? candidate.usernameFragment : null,
  };
};

const isTerminalSessionCloseReason = (reason: string): boolean => {
  const normalizedReason = reason.trim().toLowerCase();
  if (!normalizedReason) {
    return false;
  }

  return TERMINAL_CLOSE_REASON_FRAGMENTS.some((fragment) => normalizedReason.includes(fragment));
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
  const [pendingHostAction, setPendingHostAction] = useState<PendingHostAction | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [selectedRecipientUserId, setSelectedRecipientUserId] = useState<number | null>(null);
  const [queuedWebRtcSignals, setQueuedWebRtcSignals] = useState<QueuedWebRtcSignal[]>([]);
  const [localUserId, setLocalUserId] = useState<number | null>(() => readUserIdFromToken(roomToken));
  const [screenSharerUserId, setScreenSharerUserId] = useState<number | null>(null);
  const [forceStopScreenShareNonce, setForceStopScreenShareNonce] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const lastOutgoingMessageTypeRef = useRef<OutgoingMessageType | null>(null);
  const nextQueuedSignalIdRef = useRef(1);
  const leaveCloseTimeoutRef = useRef<number | null>(null);
  const isLeavingRoomRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectWindowStartedAtRef = useRef<number | null>(null);
  const suppressReconnectRef = useRef(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const hasHostActionPending = pendingHostAction !== null;
  const hostActionPendingKey = pendingHostAction ? `${pendingHostAction.type}:${pendingHostAction.userId}` : "";

  const resetRoomLocalState = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectWindowStartedAtRef.current = null;
    suppressReconnectRef.current = false;
    setReconnectAttempt(0);
    setConnectionStatus("closed");
    setSessionStatus("unknown");
    setRole("");
    setRoomState("");
    setWaitingUsers([]);
    setActiveUsers([]);
    setLastMessageType("");
    setLastError("");
    setHostActionError("");
    setPendingHostAction(null);
    setChatMessages([]);
    setChatInput("");
    setChatError("");
    setSelectedRecipientUserId(null);
    setQueuedWebRtcSignals([]);
    setLocalUserId(null);
    setScreenSharerUserId(null);
    setForceStopScreenShareNonce(0);
    nextQueuedSignalIdRef.current = 1;
  }, []);

  const clearLeaveCloseTimeout = useCallback(() => {
    if (leaveCloseTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(leaveCloseTimeoutRef.current);
    leaveCloseTimeoutRef.current = null;
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }, []);

  const closeSocketConnection = useCallback(() => {
    clearLeaveCloseTimeout();
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
  }, [clearLeaveCloseTimeout]);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    isLeavingRoomRef.current = true;
    suppressReconnectRef.current = true;
    clearReconnectTimeout();
    reconnectWindowStartedAtRef.current = null;
    setReconnectAttempt(0);
    lastOutgoingMessageTypeRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(
          JSON.stringify({
            type: "room.leave",
            payload: {},
          })
        );
      } catch {
        // Local cleanup should continue even if the server-side leave signal cannot be sent.
      }

      clearLeaveCloseTimeout();
      leaveCloseTimeoutRef.current = window.setTimeout(() => {
        closeSocketConnection();
        isLeavingRoomRef.current = false;
      }, EXPLICIT_LEAVE_CLOSE_DELAY_MS);
    } else {
      closeSocketConnection();
      isLeavingRoomRef.current = false;
    }

    clearRoomSessionToken();
    setRoomToken("");
    resetRoomLocalState();
  }, [clearLeaveCloseTimeout, clearReconnectTimeout, closeSocketConnection, resetRoomLocalState]);

  const consumeWebRtcSignal = useCallback((queueId: number) => {
    setQueuedWebRtcSignals((previousSignals) =>
      previousSignals.filter((signal) => signal.queueId !== queueId)
    );
  }, []);

  const clearPersistedRoomSession = useCallback(() => {
    clearRoomSessionToken();
    setRoomToken("");
  }, []);

  const socketConfig = useMemo(() => {
    if (!hasPrerequisites) {
      return { url: "", error: "" };
    }

    if (isRoomTokenExpired(roomToken)) {
      return { url: "", error: "Your session has expired. Please rejoin the room to continue." };
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

    if (hasHostActionPending) {
      setHostActionError("Please wait for the current moderation action to finish.");
      return;
    }

    const expectedRemovalFrom: PendingHostActionTargetScope =
      messageType === "member.kick"
        ? isUserInPresenceList(waitingUsers, userId)
          ? "waiting"
          : isUserInPresenceList(activeUsers, userId)
            ? "active"
            : "active"
        : "waiting";

    setHostActionError("");
    setPendingHostAction({
      type: messageType,
      userId,
      startedAt: Date.now(),
      expectedRemovalFrom,
    });
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
      setPendingHostAction(null);
      if (messageType === "member.kick") {
        setHostActionError("Failed to kick active user.");
      } else {
        setHostActionError(`Failed to ${messageType === "waiting.approve" ? "approve" : "reject"} waiting user.`);
      }
    }
  };

  const sendHostWaitingAction = (messageType: "waiting.approve" | "waiting.reject", userId: number | null) => {
    sendHostMemberAction(messageType, userId);
  };

  const sendHostKickAction = (userId: number | null) => {
    sendHostMemberAction("member.kick", userId);
  };

  const canSendChat = sessionStatus === "active" || role === "host";
  const canSendWebRtc = sessionStatus === "active" || role === "host";
  const isSocketOpen = connectionStatus === "open" || connectionStatus === "connected";

  const sendHostTransfer = useCallback((toUserId: number): boolean => {
    if (role !== "host") {
      return false;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      lastOutgoingMessageTypeRef.current = "host.transfer";
      socket.send(
        JSON.stringify({
          type: "host.transfer",
          payload: { to_user_id: toUserId },
        })
      );
      return true;
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      return false;
    }
  }, [role]);

  const sendEndMeeting = useCallback((): boolean => {
    if (role !== "host") {
      return false;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      lastOutgoingMessageTypeRef.current = "room.end";
      socket.send(JSON.stringify({ type: "room.end", payload: {} }));
      return true;
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      return false;
    }
  }, [role]);

  const sendScreenShareStart = useCallback((): boolean => {
    if (!canSendWebRtc) {
      setLastError("Only host or active users can start screen sharing.");
      return false;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !isSocketOpen) {
      setLastError("Cannot start screen sharing while room socket is not connected.");
      return false;
    }

    try {
      lastOutgoingMessageTypeRef.current = "screen.share.start";
      socket.send(JSON.stringify({ type: "screen.share.start", payload: {} }));
      return true;
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      setLastError("Failed to start screen sharing.");
      return false;
    }
  }, [canSendWebRtc, isSocketOpen]);

  const sendScreenShareStop = useCallback((): boolean => {
    if (!canSendWebRtc) {
      return false;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !isSocketOpen) {
      return false;
    }

    try {
      lastOutgoingMessageTypeRef.current = "screen.share.stop";
      socket.send(JSON.stringify({ type: "screen.share.stop", payload: {} }));
      return true;
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      return false;
    }
  }, [canSendWebRtc, isSocketOpen]);

  const sendHostScreenStop = useCallback((userId: number): boolean => {
    if (role !== "host") {
      return false;
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      return false;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !isSocketOpen) {
      return false;
    }

    try {
      lastOutgoingMessageTypeRef.current = "host.screen.stop";
      socket.send(
        JSON.stringify({
          type: "host.screen.stop",
          payload: { user_id: userId },
        })
      );
      return true;
    } catch {
      lastOutgoingMessageTypeRef.current = null;
      return false;
    }
  }, [isSocketOpen, role]);
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
    if (!pendingHostAction) {
      return;
    }

    const pendingUserId = pendingHostAction.userId;
    const isInWaiting = isUserInPresenceList(waitingUsers, pendingUserId);
    const isInActive = isUserInPresenceList(activeUsers, pendingUserId);

    const shouldResolve =
      pendingHostAction.type === "waiting.approve"
        ? !isInWaiting && isInActive
        : pendingHostAction.type === "waiting.reject"
          ? !isInWaiting
          : pendingHostAction.expectedRemovalFrom === "waiting"
            ? !isInWaiting
            : pendingHostAction.expectedRemovalFrom === "active"
              ? !isInActive
              : !isInWaiting && !isInActive;

    if (!shouldResolve) {
      return;
    }

    queueMicrotask(() => {
      setPendingHostAction(null);
      setHostActionError("");
      if (lastOutgoingMessageTypeRef.current === pendingHostAction.type) {
        lastOutgoingMessageTypeRef.current = null;
      }
    });
  }, [activeUsers, pendingHostAction, waitingUsers]);

  useEffect(() => {
    if (!pendingHostAction) {
      return;
    }

    const pendingStartedAt = pendingHostAction.startedAt;
    const timeoutId = window.setTimeout(() => {
      setPendingHostAction((currentPendingHostAction) => {
        if (!currentPendingHostAction || currentPendingHostAction.startedAt !== pendingStartedAt) {
          return currentPendingHostAction;
        }

        if (lastOutgoingMessageTypeRef.current === currentPendingHostAction.type) {
          lastOutgoingMessageTypeRef.current = null;
        }

        setHostActionError("Moderation update timed out. Please retry.");
        return null;
      });
    }, HOST_MODERATION_PENDING_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pendingHostAction]);

  useEffect(() => {
    if (selectedRecipientUserId === null) {
      return;
    }

    const stillValid = chatRecipientOptions.some((option) => option.userId === selectedRecipientUserId);
    if (!stillValid) {
      queueMicrotask(() => {
        setSelectedRecipientUserId(null);
      });
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

  const sendWebRtcSignal = useCallback(
    (
      messageType: WebRtcMessageType,
      payload: { to_user_id: number; sdp?: string; candidate?: RTCIceCandidateInit }
    ): boolean => {
      if (!canSendWebRtc) {
        setLastError("Only host or active users can send WebRTC signaling messages.");
        return false;
      }

      if (!payload.to_user_id || payload.to_user_id <= 0) {
        setLastError("Cannot send WebRTC signaling message to an invalid recipient.");
        return false;
      }

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || !isSocketOpen) {
        setLastError("Cannot send WebRTC signaling while room socket is not connected.");
        return false;
      }

      try {
        lastOutgoingMessageTypeRef.current = messageType;
        socket.send(
          JSON.stringify({
            type: messageType,
            payload,
          })
        );
        return true;
      } catch {
        lastOutgoingMessageTypeRef.current = null;
        setLastError("Failed to send WebRTC signaling message.");
        return false;
      }
    },
    [canSendWebRtc, isSocketOpen]
  );

  const sendWebRtcOffer = useCallback((toUserId: number | null, sdp: string): boolean => {
    if (!toUserId || sdp.length === 0) {
      return false;
    }

    return sendWebRtcSignal("webrtc.offer", {
      to_user_id: toUserId,
      sdp,
    });
  }, [sendWebRtcSignal]);

  const sendWebRtcAnswer = useCallback((toUserId: number | null, sdp: string): boolean => {
    if (!toUserId || sdp.length === 0) {
      return false;
    }

    return sendWebRtcSignal("webrtc.answer", {
      to_user_id: toUserId,
      sdp,
    });
  }, [sendWebRtcSignal]);

  const sendWebRtcIceCandidate = useCallback((toUserId: number | null, candidate: RTCIceCandidateInit): boolean => {
    if (!toUserId) {
      return false;
    }

    const normalizedCandidate = normalizeOutgoingRtcCandidate(candidate);
    if (!normalizedCandidate) {
      return false;
    }

    return sendWebRtcSignal("webrtc.ice_candidate", {
      to_user_id: toUserId,
      candidate: normalizedCandidate,
    });
  }, [sendWebRtcSignal]);

  const scheduleReconnect = useCallback(() => {
    if (isLeavingRoomRef.current || suppressReconnectRef.current) {
      return;
    }

    if (!hasPrerequisites || socketConfig.error) {
      return;
    }

    const now = Date.now();
    if (reconnectWindowStartedAtRef.current === null) {
      reconnectWindowStartedAtRef.current = now;
    }

    const elapsed = now - reconnectWindowStartedAtRef.current;
    if (elapsed >= SOCKET_RECONNECT_GRACE_WINDOW_MS) {
      clearReconnectTimeout();
      reconnectWindowStartedAtRef.current = null;
      suppressReconnectRef.current = true;
      setConnectionStatus("error");
      setSessionStatus("error");
      setLastError("Connection lost and reconnect window expired.");
      return;
    }

    if (reconnectTimeoutRef.current !== null) {
      return;
    }

    const reconnectDelay = Math.min(
      SOCKET_RECONNECT_DELAY_MS,
      SOCKET_RECONNECT_GRACE_WINDOW_MS - elapsed
    );
    setConnectionStatus("connecting");
    setLastError(SOCKET_RECONNECT_STATUS_MESSAGE);
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      setReconnectAttempt((previousAttempt) => previousAttempt + 1);
    }, reconnectDelay);
  }, [clearReconnectTimeout, hasPrerequisites, socketConfig.error]);

  useEffect(() => {
    if (!hasPrerequisites) {
      return;
    }

    if (socketConfig.error) {
      return;
    }

    let disposed = false;
    queueMicrotask(() => {
      if (disposed) {
        return;
      }

      setConnectionStatus("connecting");
      if (reconnectWindowStartedAtRef.current === null) {
        setSessionStatus("unknown");
        setLastError("");
      }
      setHostActionError("");
      setPendingHostAction(null);
      setChatError("");
    });

    isLeavingRoomRef.current = false;
    suppressReconnectRef.current = false;

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
      if (isLeavingRoomRef.current || suppressReconnectRef.current || socketRef.current !== socket) {
        return;
      }

      clearReconnectTimeout();
      reconnectWindowStartedAtRef.current = null;
      setConnectionStatus("open");
      setLastError("");
    };

    socket.onclose = (closeEvent) => {
      if (isLeavingRoomRef.current || suppressReconnectRef.current || socketRef.current !== socket) {
        return;
      }

      const closeReason = closeEvent?.reason?.trim() ?? "";
      if (isTerminalSessionCloseReason(closeReason)) {
        suppressReconnectRef.current = true;
        clearReconnectTimeout();
        reconnectWindowStartedAtRef.current = null;
        clearPersistedRoomSession();
        setSessionStatus("error");
        const normalizedCloseReason = closeReason.toLowerCase();
        const userMessage = normalizedCloseReason.includes("unable to decode token")
          ? "Your session has expired. Please rejoin the room to continue."
          : closeReason;
        setLastError(userMessage);
        setConnectionStatus("error");
        return;
      }

      if (!hadSocketError) {
        setConnectionStatus("closed");
      }

      scheduleReconnect();
    };

    socket.onerror = () => {
      if (isLeavingRoomRef.current || suppressReconnectRef.current || socketRef.current !== socket) {
        return;
      }

      hadSocketError = true;
      setConnectionStatus("error");
      scheduleReconnect();
    };

    socket.onmessage = (event) => {
      if (isLeavingRoomRef.current) {
        return;
      }

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

      const resolveIncomingWebRtcSignal = (
        type: WebRtcMessageType,
        record: JsonRecord
      ): IncomingWebRtcSignal | null => {
        const fromUserId =
          parsePositiveInteger(record.from_user_id) ??
          parsePositiveInteger(record.fromUserId) ??
          parsePositiveInteger(record.user_id);
        if (!fromUserId) {
          return null;
        }

        const toUserId = parseNullableInteger(record.to_user_id ?? record.toUserId);

        if (type === "webrtc.offer" || type === "webrtc.answer") {
          const sdp = readString(record.sdp);
          if (sdp.length === 0) {
            return null;
          }

          return {
            type,
            fromUserId,
            toUserId,
            sdp,
          };
        }

        const candidate = extractRtcIceCandidate(record.candidate);
        if (!candidate) {
          return null;
        }

        return {
          type,
          fromUserId,
          toUserId,
          candidate,
        };
      };

      switch (messageType) {
        case "system.connected": {
          clearReconnectTimeout();
          reconnectWindowStartedAtRef.current = null;
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
            if ("screen_sharer_user_id" in payloadValue || "screenSharerUserId" in payloadValue) {
              setScreenSharerUserId(
                parseNullableInteger(payloadValue.screen_sharer_user_id ?? payloadValue.screenSharerUserId)
              );
            } else {
              setScreenSharerUserId(null);
            }
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
          suppressReconnectRef.current = true;
          clearReconnectTimeout();
          reconnectWindowStartedAtRef.current = null;
          clearPersistedRoomSession();
          setRoomState("rejected");
          setSessionStatus("rejected");
          setScreenSharerUserId(null);
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
          suppressReconnectRef.current = true;
          clearReconnectTimeout();
          reconnectWindowStartedAtRef.current = null;
          clearPersistedRoomSession();
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error"])
            : "";
          setSessionStatus("kicked");
          setScreenSharerUserId(null);
          setLastError(message || "You were removed from this room.");
          socket.close();
          break;
        }
        case "system.disconnected": {
          lastOutgoingMessageTypeRef.current = null;
          suppressReconnectRef.current = true;
          clearReconnectTimeout();
          reconnectWindowStartedAtRef.current = null;
          clearPersistedRoomSession();
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error", "reason"])
            : "";
          setSessionStatus("disconnected");
          setRoomState("disconnected");
          setScreenSharerUserId(null);
          setConnectionStatus("closed");
          setLastError(message || "This session was disconnected, likely replaced by a newer connection.");
          socket.close();
          break;
        }
        case "host.transferred": {
          if (!isJsonRecord(payloadValue)) {
            break;
          }
          const newToken = pickString(payloadValue, ["new_token", "newToken"]);
          const newRole = pickString(payloadValue, ["role"]);

          if (newToken) {
            setRoomSessionToken(newToken);
            setRoomToken(newToken);
          }

          if (newRole) {
            setRole(newRole);
          }

          if (newRole === "host") {
            const active = resolveList(payloadValue, ["active_users", "active"]);
            const waiting = resolveList(payloadValue, ["waiting_users", "waiting"]);
            setActiveUsers(active);
            setWaitingUsers(waiting);
          }
          break;
        }
        case "room.ended": {
          lastOutgoingMessageTypeRef.current = null;
          suppressReconnectRef.current = true;
          clearReconnectTimeout();
          reconnectWindowStartedAtRef.current = null;
          clearPersistedRoomSession();
          const endReason = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["reason", "message", "detail"])
            : "";
          setSessionStatus("disconnected");
          setRoomState("disconnected");
          setScreenSharerUserId(null);
          setConnectionStatus("closed");
          setLastError(endReason || "The meeting was ended by the host.");
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
        case "webrtc.offer":
        case "webrtc.answer":
        case "webrtc.ice_candidate": {
          if (!isJsonRecord(payloadValue)) {
            setLastError("Received malformed WebRTC signaling payload.");
            break;
          }

          const signal = resolveIncomingWebRtcSignal(messageType, payloadValue);
          if (!signal) {
            setLastError("Received invalid WebRTC signaling payload.");
            break;
          }

          setQueuedWebRtcSignals((previousSignals) => [
            ...previousSignals,
            {
              ...signal,
              queueId: nextQueuedSignalIdRef.current++,
            },
          ]);
          if (lastOutgoingMessageTypeRef.current === messageType) {
            lastOutgoingMessageTypeRef.current = null;
          }
          break;
        }
        case "screen.share.state": {
          if (!isJsonRecord(payloadValue)) {
            break;
          }
          setScreenSharerUserId(
            parseNullableInteger(payloadValue.user_id ?? payloadValue.userId)
          );
          if (
            lastOutgoingMessageTypeRef.current === "screen.share.start" ||
            lastOutgoingMessageTypeRef.current === "screen.share.stop" ||
            lastOutgoingMessageTypeRef.current === "host.screen.stop"
          ) {
            lastOutgoingMessageTypeRef.current = null;
          }
          break;
        }
        case "screen.share.force_stop": {
          setForceStopScreenShareNonce((previousNonce) => previousNonce + 1);
          break;
        }
        case "error": {
          const message = isJsonRecord(payloadValue)
            ? pickString(payloadValue, ["message", "detail", "error"])
            : "";
          const normalizedMessage = message.toLowerCase();

          const isWebRtcRelatedError =
            lastOutgoingMessageTypeRef.current === "webrtc.offer" ||
            lastOutgoingMessageTypeRef.current === "webrtc.answer" ||
            lastOutgoingMessageTypeRef.current === "webrtc.ice_candidate" ||
            lastOutgoingMessageTypeRef.current === "screen.share.start" ||
            lastOutgoingMessageTypeRef.current === "screen.share.stop" ||
            lastOutgoingMessageTypeRef.current === "host.screen.stop" ||
            WEBRTC_ERROR_FRAGMENTS.some((fragment) => normalizedMessage.includes(fragment)) ||
            normalizedMessage.includes("webrtc") ||
            normalizedMessage.includes("sdp") ||
            normalizedMessage.includes("candidate") ||
            normalizedMessage.includes("screen share");
          if (isWebRtcRelatedError) {
            setLastError(message || "Failed to exchange WebRTC signaling data.");
            lastOutgoingMessageTypeRef.current = null;
            break;
          }

          const isChatRelatedError =
            lastOutgoingMessageTypeRef.current === "chat.send" ||
            CHAT_ERROR_FRAGMENTS.some((fragment) => normalizedMessage.includes(fragment));

          if (isChatRelatedError) {
            setChatError(message || "Failed to send chat message.");
            lastOutgoingMessageTypeRef.current = null;
            break;
          }

          const isPendingHostControlAction =
            lastOutgoingMessageTypeRef.current === "host.transfer" ||
            lastOutgoingMessageTypeRef.current === "room.end";
          const isHostControlError = HOST_CONTROL_ERROR_FRAGMENTS.some((fragment) =>
            normalizedMessage.includes(fragment)
          );
          if (isPendingHostControlAction || isHostControlError) {
            setLastError(message || "Failed to update host meeting controls.");
            if (isPendingHostControlAction) {
              lastOutgoingMessageTypeRef.current = null;
            }
            break;
          }

          const isPendingHostModerationAction =
            lastOutgoingMessageTypeRef.current === "waiting.approve" ||
            lastOutgoingMessageTypeRef.current === "waiting.reject" ||
            lastOutgoingMessageTypeRef.current === "member.kick";
          const isHostModerationError = HOST_MODERATION_ERROR_FRAGMENTS.some((fragment) =>
            normalizedMessage.includes(fragment)
          );
          if (isPendingHostModerationAction || isHostModerationError) {
            setHostActionError(message || "Failed to complete host moderation action.");
            setPendingHostAction(null);
            if (isPendingHostModerationAction) {
              lastOutgoingMessageTypeRef.current = null;
            }
            break;
          }

          setSessionStatus("error");
          suppressReconnectRef.current = true;
          clearReconnectTimeout();
          reconnectWindowStartedAtRef.current = null;
          setLastError(message || "Room WebSocket error message received.");
          break;
        }
        default:
          break;
      }
    };

    return () => {
      disposed = true;
      if (isLeavingRoomRef.current && leaveCloseTimeoutRef.current !== null) {
        return;
      }

      clearReconnectTimeout();
      closeSocketConnection();
    };
  }, [
    clearPersistedRoomSession,
    clearReconnectTimeout,
    closeSocketConnection,
    hasPrerequisites,
    reconnectAttempt,
    scheduleReconnect,
    socketConfig.error,
    socketConfig.url,
  ]);

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
    queuedWebRtcSignals,
    localUserId,
    screenSharerUserId,
    forceStopScreenShareNonce,
    hasPrerequisites,
    normalizedRoomCode,
    prerequisiteErrors,
    displayedError,
    hasHostActionPending,
    canSendChat,
    canSendWebRtc,
    isSocketOpen,
    isHost,
    isFinalState,
    transportStatus,
    setChatInput,
    setSelectedRecipientUserId,
    setSelectedRecipientFromValue,
    sendHostWaitingAction,
    sendHostKickAction,
    sendHostTransfer,
    sendHostScreenStop,
    sendEndMeeting,
    sendScreenShareStart,
    sendScreenShareStop,
    sendChatMessage,
    sendWebRtcOffer,
    sendWebRtcAnswer,
    sendWebRtcIceCandidate,
    consumeWebRtcSignal,
    leaveRoom,
  };
};
