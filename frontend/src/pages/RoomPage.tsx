import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type RoomPresenceUser, type SessionStatus, useRoomSocket } from "../hooks/useRoomSocket";
import { getRoomEntryPreferences } from "../lib/roomEntryPreferences";

type StatusTone = "neutral" | "success" | "warning" | "danger";

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

const getPresenceUserLabel = (user: RoomPresenceUser): string => {
  if (user.label.trim()) {
    return user.label;
  }

  if (user.userId !== null) {
    return `User ${user.userId}`;
  }

  return "Unknown user";
};

function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const {
    activeUsers,
    canSendChat,
    chatError,
    chatInput,
    chatMessages,
    chatRecipientOptions,
    displayedError,
    hasPrerequisites,
    hostActionError,
    hostActionPendingKey,
    isFinalState,
    isHost,
    isSocketOpen,
    lastMessageType,
    localUserId,
    normalizedRoomCode,
    role,
    roomState,
    selectedRecipientUserId,
    sendChatMessage,
    sendHostKickAction,
    sendHostWaitingAction,
    leaveRoom,
    sessionStatus,
    setSelectedRecipientFromValue,
    setChatInput,
    transportStatus,
    waitingUsers,
  } = useRoomSocket({ roomCode });
  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/dashboard");
  };

  const stateContent = getSessionStateContent(sessionStatus, displayedError);
  const toneClasses = getToneClasses(stateContent.tone);
  const roomEntryPreferences = useMemo(
    () => getRoomEntryPreferences(normalizedRoomCode),
    [normalizedRoomCode]
  );

  useEffect(() => {
    if (!hasPrerequisites) {
      navigate("/dashboard", { replace: true });
    }
  }, [hasPrerequisites, navigate]);

  if (!hasPrerequisites) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Meeting Room</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                SecureMeet room access and real-time session status.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Leave room
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room code</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{normalizedRoomCode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Display name</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {roomEntryPreferences?.displayName || "Not set"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Connection</p>
              <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {formatStatusLabel(transportStatus)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Microphone</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {roomEntryPreferences?.audioEnabled === false ? "Off" : "On"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Camera</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {roomEntryPreferences?.videoEnabled === false ? "Off" : "On"}
              </p>
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
                onClick={handleLeaveRoom}
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
                  {waitingUsers.map((user) => {
                    const userLabel = getPresenceUserLabel(user);
                    const userKey = user.userId !== null ? String(user.userId) : user.label;
                    const approveKey = user.userId ? `waiting.approve:${user.userId}` : "";
                    const rejectKey = user.userId ? `waiting.reject:${user.userId}` : "";
                    const canModerate = user.userId !== null;

                    return (
                      <li
                        key={userKey}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => sendHostWaitingAction("waiting.approve", user.userId)}
                            disabled={!canModerate || hostActionPendingKey === approveKey}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => sendHostWaitingAction("waiting.reject", user.userId)}
                            disabled={!canModerate || hostActionPendingKey === rejectKey}
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
                    {activeUsers.map((user) => {
                      const userId = user.userId;
                      const userLabel = getPresenceUserLabel(user);
                      const kickKey = userId ? `member.kick:${userId}` : "";
                      const isLocalHost = localUserId !== null && userId === localUserId;
                      const canKick = Boolean(userId) && !isLocalHost;

                      return (
                        <li
                          key={userId !== null ? String(userId) : userLabel}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800"
                        >
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                          {canKick ? (
                            <button
                              type="button"
                              onClick={() => sendHostKickAction(userId)}
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
                Room chat for active participants and host. Choose Public or send privately to a user.
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
                        {message.from_display_name || (message.from_user_id ? `User ${message.from_user_id}` : "Unknown")}
                        {message.to_user_id
                          ? ` • Private to ${message.to_display_name || `User ${message.to_user_id}`}`
                          : " • Public"}
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
              <select
                value={selectedRecipientUserId === null ? "public" : String(selectedRecipientUserId)}
                onChange={(event) => setSelectedRecipientFromValue(event.target.value)}
                disabled={!canSendChat || !isSocketOpen}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
              >
                <option value="public">Public</option>
                {chatRecipientOptions.map((option) => (
                  <option key={option.userId} value={option.userId}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                  {isHost ? `Waiting users (${waitingUsers.length})` : "Waiting users (Host-only visibility)"}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {isHost
                    ? waitingUsers.map((user) => getPresenceUserLabel(user)).join(", ") || "None"
                    : "Unavailable for participants"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active users ({activeUsers.length})
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {activeUsers.map((user) => getPresenceUserLabel(user)).join(", ") || "None"}
                </p>
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
