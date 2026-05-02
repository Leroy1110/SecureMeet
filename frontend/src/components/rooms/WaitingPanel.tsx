import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import { SmButton, SmIcon } from "../sm";

const getPresenceUserLabel = (user: RoomPresenceUser): string => {
  if (user.label.trim()) {
    return user.label;
  }

  if (user.userId !== null) {
    return `User ${user.userId}`;
  }

  return "Unknown user";
};

const initialsFor = (value: string): string => {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "?";
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
};

type WaitingPanelProps = {
  waitingUsers: RoomPresenceUser[];
  hostActionError: string;
  hasHostActionPending: boolean;
  onApprove: (userId: number | null) => void;
  onReject: (userId: number | null) => void;
};

const WaitingPanel = ({
  waitingUsers,
  hostActionError,
  hasHostActionPending,
  onApprove,
  onReject,
}: WaitingPanelProps) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {hostActionError ? (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--sm-danger-soft)",
            color: "var(--sm-danger)",
            fontSize: 13,
          }}
        >
          {hostActionError}
        </div>
      ) : null}

      {waitingUsers.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            borderRadius: 20,
            background: "var(--sm-bg-sunken)",
            color: "var(--sm-fg-muted)",
            fontSize: 13.5,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#fff",
              color: "var(--sm-fg-subtle)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--sm-shadow-xs)",
            }}
          >
            <SmIcon name="users" size={16} />
          </span>
          No one is waiting for approval.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {waitingUsers.map((user) => {
            const userLabel = getPresenceUserLabel(user);
            const userId = user.userId;
            const canModerate = userId !== null;

            return (
              <li
                key={userId !== null ? String(userId) : userLabel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "var(--sm-bg-sunken)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: "var(--sm-fg)",
                      color: "#F5F5F7",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {initialsFor(userLabel)}
                  </span>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "var(--sm-fg)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {userLabel}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <SmButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(userId)}
                    disabled={!canModerate || hasHostActionPending}
                    style={{
                      background: "var(--sm-danger-soft)",
                      color: "var(--sm-danger)",
                    }}
                  >
                    Deny
                  </SmButton>
                  <SmButton
                    variant="primary"
                    size="sm"
                    onClick={() => onApprove(userId)}
                    disabled={!canModerate || hasHostActionPending}
                  >
                    Admit
                  </SmButton>
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
