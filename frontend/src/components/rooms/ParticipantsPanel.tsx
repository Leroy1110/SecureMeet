import { type RoomPresenceUser } from "../../hooks/useRoomSocket";

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
  rtcTargetUserId: number | null;
  onSelectRtcTarget: (userId: number) => void;
};

const ParticipantsPanel = ({
  activeUsers,
  localUserId,
  rtcTargetUserId,
  onSelectRtcTarget,
}: ParticipantsPanelProps) => {
  if (activeUsers.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">No active users yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {activeUsers.map((user) => {
        const userLabel = getPresenceUserLabel(user);
        const userId = user.userId;
        const isLocalUser = localUserId !== null && userId === localUserId;
        const canSelect = userId !== null && !isLocalUser;
        const selected = userId !== null && userId === rtcTargetUserId;

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
              {canSelect ? (
                <button
                  type="button"
                  onClick={() => onSelectRtcTarget(userId)}
                  className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium transition ${
                    selected
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {selected ? "Selected" : "Connect"}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ParticipantsPanel;
