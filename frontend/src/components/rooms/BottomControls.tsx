import { SmIcon, type SmIconName } from "../sm";

type BottomControlsProps = {
  activeCount: number;
  waitingCount: number;
  isHost: boolean;
  onOpenActive: () => void;
  onOpenWaiting: () => void;
  onOpenChat: () => void;
  onLeave: () => void;
};

type ControlButtonProps = {
  icon: SmIconName;
  label: string;
  onClick?: () => void;
  tone?: "default" | "muted" | "danger";
  disabled?: boolean;
  badge?: number;
  title?: string;
};

const ControlButton = ({
  icon,
  label,
  onClick,
  tone = "default",
  disabled = false,
  badge,
  title,
}: ControlButtonProps) => {
  const base: React.CSSProperties = {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 999,
    border: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "#F5F5F7",
    background: "rgba(255,255,255,0.08)",
    transition: "background 220ms var(--sm-ease-standard), transform 140ms var(--sm-ease-standard)",
    opacity: disabled ? 0.45 : 1,
  };

  const toneStyle: React.CSSProperties =
    tone === "danger"
      ? { background: "var(--sm-danger)", color: "#fff" }
      : tone === "muted"
      ? { background: "rgba(255,255,255,0.04)" }
      : {};

  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className="sm-press"
      style={{ ...base, ...toneStyle }}
    >
      <SmIcon name={icon} size={18} />
      {typeof badge === "number" && badge > 0 ? (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "var(--sm-accent)",
            color: "#fff",
            fontSize: 10.5,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 2px rgba(22,23,27,0.85)",
            fontFamily: "var(--sm-font-mono)",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
};

const EndButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="sm-press"
    style={{
      height: 48,
      padding: "0 22px",
      borderRadius: 999,
      border: 0,
      background: "var(--sm-danger)",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--sm-font-text)",
    }}
  >
    <SmIcon name="logout" size={16} />
    Leave
  </button>
);

const BottomControls = ({
  activeCount,
  waitingCount,
  isHost,
  onOpenActive,
  onOpenWaiting,
  onOpenChat,
  onLeave,
}: BottomControlsProps) => {
  return (
    <footer
      style={{
        position: "sticky",
        bottom: 20,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        padding: "16px 8px 0",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: 10,
          borderRadius: 999,
          background: "rgba(22,23,27,0.78)",
          backdropFilter: "var(--sm-blur-md)",
          WebkitBackdropFilter: "var(--sm-blur-md)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "var(--sm-shadow-lg)",
        }}
      >
        <ControlButton
          icon="mic"
          label="Mute"
          tone="muted"
          disabled
          title="Mute/unmute signaling is not available in V1"
        />
        <ControlButton
          icon="video"
          label="Camera"
          tone="muted"
          disabled
          title="Camera toggle is not available in V1"
        />
        <ControlButton
          icon="screen"
          label="Share"
          tone="muted"
          disabled
          title="Screen sharing is not available in V1"
        />
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
        <ControlButton
          icon="users"
          label="Participants"
          onClick={onOpenActive}
          badge={activeCount}
        />
        {isHost ? (
          <ControlButton
            icon="sparkle"
            label="Waiting room"
            onClick={onOpenWaiting}
            badge={waitingCount}
          />
        ) : null}
        <ControlButton icon="chat" label="Chat" onClick={onOpenChat} />
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
        <EndButton onClick={onLeave} />
      </div>
    </footer>
  );
};

export default BottomControls;
