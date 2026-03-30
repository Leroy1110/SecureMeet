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

type WaitingPanelProps = {
  waitingUsers: RoomPresenceUser[];
  hostActionError: string;
  hostActionPendingKey: string;
  onApprove: (userId: number | null) => void;
  onReject: (userId: number | null) => void;
};

const WaitingPanel = ({
  waitingUsers,
  hostActionError,
  hostActionPendingKey,
  onApprove,
  onReject,
}: WaitingPanelProps) => {
  return (
    <div className="space-y-3">
      {hostActionError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {hostActionError}
        </p>
      ) : null}

      {waitingUsers.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">No one is waiting for approval.</p>
      ) : (
        <ul className="space-y-2">
          {waitingUsers.map((user) => {
            const userLabel = getPresenceUserLabel(user);
            const userId = user.userId;
            const canModerate = userId !== null;
            const approveKey = userId ? `waiting.approve:${userId}` : "";
            const rejectKey = userId ? `waiting.reject:${userId}` : "";

            return (
              <li
                key={userId !== null ? String(userId) : userLabel}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(userId)}
                    disabled={!canModerate || hostActionPendingKey === approveKey}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(userId)}
                    disabled={!canModerate || hostActionPendingKey === rejectKey}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                  >
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default WaitingPanel;
