import { SmBadge, SmButton, SmLogo } from "../sm";

type RoomHeaderProps = {
  roomCode: string;
  displayName: string;
  roleLabel: string;
  connectionLabel: string;
  sessionLabel: string;
  onLeave: () => void;
};

const RoomHeader = ({
  roomCode,
  displayName,
  roleLabel,
  connectionLabel,
  sessionLabel,
  onLeave,
}: RoomHeaderProps) => {
  const isConnected = connectionLabel.toLowerCase().includes("open")
    || connectionLabel.toLowerCase().includes("connected");
  const sessionTone =
    sessionLabel.toLowerCase().includes("active")
      ? "inverse-success"
      : sessionLabel.toLowerCase().includes("waiting")
      ? "inverse-neutral"
      : "inverse-danger";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 14px 10px 18px",
        borderRadius: 999,
        background: "rgba(22,23,27,0.68)",
        backdropFilter: "var(--sm-blur-md)",
        WebkitBackdropFilter: "var(--sm-blur-md)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "var(--sm-stage-fg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <SmLogo size={24} withWordmark={false} inverse />
        <div style={{ minWidth: 0 }}>
          <div
            className="sm-mono"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--sm-stage-fg)",
              letterSpacing: "-0.005em",
            }}
          >
            {roomCode}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--sm-stage-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName} · {roleLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <SmBadge tone={isConnected ? "inverse-success" : "inverse-neutral"} dot>
          {connectionLabel}
        </SmBadge>
        <SmBadge tone={sessionTone}>
          {sessionLabel}
        </SmBadge>
        <SmButton variant="danger" size="sm" onClick={onLeave}>
          Leave
        </SmButton>
      </div>
    </header>
  );
};

export default RoomHeader;
