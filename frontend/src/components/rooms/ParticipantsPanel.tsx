import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import type { PeerConnectionSnapshot } from "../../hooks/useWebRtcPeers";

const getPresenceUserLabel = (user: RoomPresenceUser): string => {
  if (user.label.trim()) {
    return user.label;
  }

  if (user.userId !== null) {
    return `User ${user.userId}`;
  }

  return "Unknown user";
};

type ParticipantsPanelProps = {
  activeUsers: RoomPresenceUser[];
  localUserId: number | null;
  peerStates: Map<number, PeerConnectionSnapshot>;
};

const statusLabelForSnapshot = (snapshot: PeerConnectionSnapshot | undefined): string => {
  if (!snapshot) {
    return "Not connected";
  }

  if (snapshot.error) {
    return "Error";
  }

  switch (snapshot.connectionState) {
    case "connected":
      return "Connected";
    case "connecting":
    case "new":
      return "Connecting";
    case "disconnected":
      return "Disconnected";
    case "failed":
      return "Failed";
    case "closed":
      return "Closed";
    default:
      return "Connecting";
  }
};

const statusBadgeClass = (snapshot: PeerConnectionSnapshot | undefined): string => {
  if (!snapshot || snapshot.connectionState === "closed" || snapshot.connectionState === "new") {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }

  if (snapshot.error || snapshot.connectionState === "failed") {
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300";
  }

  if (snapshot.connectionState === "connected") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (snapshot.connectionState === "disconnected") {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300";
};

const ParticipantsPanel = ({ activeUsers, localUserId, peerStates }: ParticipantsPanelProps) => {
  if (activeUsers.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">No active users yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {activeUsers.map((user) => {
        const userLabel = getPresenceUserLabel(user);
        const userId = user.userId;
        const isLocalUser = localUserId !== null && userId === localUserId;
        const snapshot = userId !== null && !isLocalUser ? peerStates.get(userId) : undefined;

        return (
          <li
            key={userId !== null ? String(userId) : userLabel}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isLocalUser ? "You" : "Participant"}</p>
              </div>
              {!isLocalUser && userId !== null ? (
                <span
                  className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium ${statusBadgeClass(snapshot)}`}
                >
                  {statusLabelForSnapshot(snapshot)}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ParticipantsPanel;
