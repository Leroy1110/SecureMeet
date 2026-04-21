import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import type { PeerConnectionSnapshot } from "../../hooks/useWebRtcPeers";
import { SmBadge, SmButton } from "../sm";

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

type ParticipantsPanelProps = {
  activeUsers: RoomPresenceUser[];
  localUserId: number | null;
  peerStates: Map<number, PeerConnectionSnapshot>;
  isHost: boolean;
  onMakeHost: (userId: number) => void;
};

const statusLabelForSnapshot = (snapshot: PeerConnectionSnapshot | undefined): string => {
  if (!snapshot) {
    return "Idle";
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

const statusTone = (
  snapshot: PeerConnectionSnapshot | undefined,
): "success" | "danger" | "warn" | "neutral" => {
  if (!snapshot) return "neutral";
  if (snapshot.error || snapshot.connectionState === "failed") return "danger";
  if (snapshot.connectionState === "connected") return "success";
  if (snapshot.connectionState === "disconnected") return "warn";
  return "neutral";
};

const ParticipantsPanel = ({
  activeUsers,
  localUserId,
  peerStates,
  isHost,
  onMakeHost,
}: ParticipantsPanelProps) => {
  if (activeUsers.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--sm-fg-muted)" }}>
        No active participants yet.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {activeUsers.map((user) => {
        const userLabel = getPresenceUserLabel(user);
        const userId = user.userId;
        const isLocalUser = localUserId !== null && userId === localUserId;
        const snapshot = userId !== null && !isLocalUser ? peerStates.get(userId) : undefined;
        const canMakeHost = isHost && !isLocalUser && userId !== null;

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
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "var(--sm-fg)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {userLabel}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--sm-fg-subtle)" }}>
                  {isLocalUser ? "You · local" : "Participant"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {!isLocalUser && userId !== null ? (
                <SmBadge tone={statusTone(snapshot)}>
                  {statusLabelForSnapshot(snapshot)}
                </SmBadge>
              ) : null}
              {canMakeHost ? (
                <SmButton variant="ghost" size="sm" onClick={() => onMakeHost(userId)}>
                  Make host
                </SmButton>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ParticipantsPanel;
