import { useState } from "react";
import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import { SmButton } from "../sm";

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

type HostLeaveDialogProps = {
  isOpen: boolean;
  activeUsers: RoomPresenceUser[];
  localUserId: number | null;
  onTransferAndLeave: (toUserId: number) => void;
  onEndMeeting: () => void;
  onCancel: () => void;
};

const HostLeaveDialog = ({
  isOpen,
  activeUsers,
  localUserId,
  onTransferAndLeave,
  onEndMeeting,
  onCancel,
}: HostLeaveDialogProps) => {
  const [step, setStep] = useState<"select" | "confirm_end">("select");

  if (!isOpen) {
    return null;
  }

  const otherParticipants = activeUsers.filter(
    (user) => user.userId !== null && user.userId !== localUserId
  );
  const hasOtherParticipants = otherParticipants.length > 0;

  const handleOpenConfirmEnd = () => {
    setStep("confirm_end");
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleCancel = () => {
    setStep("select");
    onCancel();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        style={{
          position: "absolute",
          inset: 0,
          border: 0,
          cursor: "pointer",
          background: "var(--sm-overlay)",
          backdropFilter: "var(--sm-blur-sm)",
          WebkitBackdropFilter: "var(--sm-blur-sm)",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 28,
          padding: 28,
          boxShadow: "var(--sm-shadow-xl)",
        }}
      >
        {step === "select" ? (
          <>
            <h2
              className="sm-h2"
              style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}
            >
              Leave meeting
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13.5,
                lineHeight: 1.5,
                color: "var(--sm-fg-muted)",
              }}
            >
              You're the host. Pick how to end your participation.
            </p>

            {hasOtherParticipants ? (
              <div style={{ marginTop: 22 }}>
                <p
                  className="sm-eyebrow"
                  style={{ marginBottom: 10, fontSize: 10.5 }}
                >
                  Transfer host & leave
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {otherParticipants.map((user) => {
                    const userLabel = getPresenceUserLabel(user);
                    const userId = user.userId!;

                    return (
                      <li key={userId}>
                        <button
                          type="button"
                          onClick={() => onTransferAndLeave(userId)}
                          className="sm-press"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: 0,
                            background: "var(--sm-bg-sunken)",
                            color: "var(--sm-fg)",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "var(--sm-font-text)",
                          }}
                        >
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              background: "var(--sm-fg)",
                              color: "#F5F5F7",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11.5,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {initialsFor(userLabel)}
                          </span>
                          <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                            Transfer to {userLabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div
              style={{
                marginTop: hasOtherParticipants ? 22 : 18,
                paddingTop: hasOtherParticipants ? 18 : 0,
                borderTop: hasOtherParticipants ? "1px solid var(--sm-line)" : "none",
              }}
            >
              <p
                className="sm-eyebrow"
                style={{ marginBottom: 8, fontSize: 10.5 }}
              >
                End meeting for everyone
              </p>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 12.5,
                  color: "var(--sm-fg-muted)",
                }}
              >
                Closes the room immediately for all participants.
              </p>
              <SmButton
                variant="danger"
                size="md"
                fullWidth
                onClick={handleOpenConfirmEnd}
              >
                End meeting for all
              </SmButton>
            </div>

            <div style={{ marginTop: 10 }}>
              <SmButton
                variant="ghost"
                size="md"
                fullWidth
                onClick={handleCancel}
              >
                Cancel
              </SmButton>
            </div>
          </>
        ) : (
          <>
            <h2
              className="sm-h2"
              style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}
            >
              End meeting for all?
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13.5,
                lineHeight: 1.5,
                color: "var(--sm-fg-muted)",
              }}
            >
              Every participant will be disconnected and the room will close. This can't be undone.
            </p>

            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 8 }}>
              <SmButton variant="danger" size="md" fullWidth onClick={onEndMeeting}>
                End meeting
              </SmButton>
              <SmButton variant="secondary" size="md" fullWidth onClick={handleBack}>
                Back
              </SmButton>
              <SmButton variant="ghost" size="md" fullWidth onClick={handleCancel}>
                Cancel
              </SmButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HostLeaveDialog;
