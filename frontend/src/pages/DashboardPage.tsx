import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SmBadge, SmButton, SmField, SmIcon, SmLogo, SmToggle } from "../components/sm";
import { useAuth } from "../hooks/useAuth";
import { post } from "../lib/apiClient";
import { clearRoomEntryPreferences, saveRoomEntryPreferences } from "../lib/roomEntryPreferences";
import { clearRoomSessionToken, setRoomSessionToken } from "../lib/roomSession";
import type {
  RoomCreateResponse,
  RoomDisplayNameUpdateResponse,
  RoomJoinResponse,
} from "../lib/types";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const greetingForHour = (hour: number): string => {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

type ActionTileProps = {
  title: string;
  description: string;
  icon: "plus" | "arrow";
  accent?: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const ActionTile = ({ title, description, icon, accent, onClick, disabled, loading }: ActionTileProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="sm-press"
    style={{
      all: "unset",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 28,
      minHeight: 208,
      padding: 28,
      borderRadius: 28,
      background: accent ? "var(--sm-fg)" : "#fff",
      color: accent ? "#F5F5F7" : "var(--sm-fg)",
      boxShadow: accent
        ? "var(--sm-shadow-lg), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-md)",
      transition: "all 320ms var(--sm-ease-standard)",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        borderRadius: 16,
        background: accent ? "rgba(255,255,255,0.12)" : "var(--sm-bg-tint)",
        color: accent ? "#F5F5F7" : "var(--sm-fg)",
      }}
    >
      <SmIcon name={icon} size={20} strokeWidth={1.8} />
    </span>
    <div>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--sm-font-display)",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {loading ? "Creating…" : title}
      </h2>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 14.5,
          lineHeight: 1.5,
          color: accent ? "rgba(245,245,247,0.7)" : "var(--sm-fg-muted)",
          maxWidth: 320,
        }}
      >
        {description}
      </p>
    </div>
  </button>
);

type ModalShellProps = {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
};

const ModalShell = ({ title, description, onClose, children }: ModalShellProps) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      background: "var(--sm-overlay)",
      backdropFilter: "var(--sm-blur-sm)",
      WebkitBackdropFilter: "var(--sm-blur-sm)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      onClick={(event) => event.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 520,
        background: "#fff",
        borderRadius: 28,
        padding: 32,
        boxShadow: "var(--sm-shadow-xl)",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h2
          className="sm-h2"
          style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--sm-fg-muted)",
          }}
        >
          {description}
        </p>
      </header>
      {children}
    </div>
  </div>
);

const credentialCardStyle: React.CSSProperties = {
  borderRadius: 20,
  background: "var(--sm-bg-sunken)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

function DashboardPage() {
  const { token, user, clearToken } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdRoom, setCreatedRoom] = useState<RoomCreateResponse | null>(null);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinAudioEnabled, setJoinAudioEnabled] = useState(true);
  const [joinVideoEnabled, setJoinVideoEnabled] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [hostDisplayName, setHostDisplayName] = useState("");
  const [hostAudioEnabled, setHostAudioEnabled] = useState(true);
  const [hostVideoEnabled, setHostVideoEnabled] = useState(true);
  const [hostStarting, setHostStarting] = useState(false);
  const [hostError, setHostError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");

  const defaultDisplayName = useMemo(() => user?.username?.trim() ?? "", [user?.username]);
  const greeting = useMemo(() => {
    const salutation = greetingForHour(now.getHours());
    return user?.username ? `${salutation}, ${user.username}` : salutation;
  }, [now, user?.username]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!joinModalOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !joinLoading) {
        setJoinModalOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [joinModalOpen, joinLoading]);

  useEffect(() => {
    if (!createdRoom) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !hostStarting) {
        setCreatedRoom(null);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [createdRoom, hostStarting]);

  const getRequestErrorMessage = (error: unknown, fallbackMessage: string): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallbackMessage;
  };

  const handleLogout = () => {
    clearToken();
    clearRoomSessionToken();
    clearRoomEntryPreferences();
    navigate("/login");
  };

  const openJoinModal = () => {
    setJoinModalOpen(true);
    setJoinRoomCode("");
    setJoinRoomPassword("");
    setJoinDisplayName(defaultDisplayName);
    setJoinAudioEnabled(true);
    setJoinVideoEnabled(true);
    setJoinError("");
  };

  const closeJoinModal = () => {
    if (joinLoading) {
      return;
    }

    setJoinModalOpen(false);
  };

  const closeHostModal = () => {
    if (hostStarting) {
      return;
    }

    setCreatedRoom(null);
    setHostError("");
  };

  const handleCreateRoom = async () => {
    if (createLoading) {
      return;
    }

    if (!token) {
      setCreateError("Unauthorized. Please sign in again.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    setHostError("");
    setCopyFeedback("");

    try {
      const response = await post<RoomCreateResponse>("/rooms/", null, {
        Authorization: `Bearer ${token}`,
      });

      setCreatedRoom(response);
      setHostDisplayName(defaultDisplayName);
      setHostAudioEnabled(true);
      setHostVideoEnabled(true);
    } catch (creationError) {
      setCreateError(getRequestErrorMessage(creationError, "Unable to create room right now."));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (joinLoading) {
      return;
    }

    if (!token) {
      setJoinError("Unauthorized. Please sign in again.");
      return;
    }

    const roomCode = joinRoomCode.trim();
    const roomPassword = joinRoomPassword.trim();
    const displayName = joinDisplayName.trim();

    if (!roomCode || !roomPassword) {
      setJoinError("Room code and password are required.");
      return;
    }

    setJoinLoading(true);
    setJoinError("");

    try {
      const response = await post<RoomJoinResponse>(
        "/rooms/join",
        {
          room_code: roomCode,
          room_password: roomPassword,
          display_name: displayName || undefined,
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );

      if (!response.room_jwt) {
        throw new Error("Unable to join room right now.");
      }

      setRoomSessionToken(response.room_jwt);
      saveRoomEntryPreferences({
        roomCode,
        displayName: displayName || defaultDisplayName,
        audioEnabled: joinAudioEnabled,
        videoEnabled: joinVideoEnabled,
      });

      setJoinRoomPassword("");
      setJoinModalOpen(false);
      navigate(`/rooms/${roomCode}`);
    } catch (joinRoomError) {
      setJoinError(getRequestErrorMessage(joinRoomError, "Unable to join room right now."));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleStartMeeting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hostStarting || !createdRoom) {
      return;
    }

    if (!token) {
      setHostError("Unauthorized. Please sign in again.");
      return;
    }

    const roomCode = createdRoom.room_code.trim();
    const roomJwt = createdRoom.room_jwt?.trim() ?? "";
    const displayName = hostDisplayName.trim();

    if (!roomCode || !roomJwt) {
      setHostError("Unable to start this meeting because room details are missing.");
      return;
    }

    if (!displayName) {
      setHostError("Display name is required.");
      return;
    }

    setHostStarting(true);
    setHostError("");

    try {
      await post<RoomDisplayNameUpdateResponse>(
        "/rooms/display-name",
        {
          room_code: roomCode,
          display_name: displayName,
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );

      setRoomSessionToken(roomJwt);
      saveRoomEntryPreferences({
        roomCode,
        displayName,
        audioEnabled: hostAudioEnabled,
        videoEnabled: hostVideoEnabled,
      });

      setCreatedRoom(null);
      navigate(`/rooms/${roomCode}`);
    } catch (startError) {
      setHostError(getRequestErrorMessage(startError, "Unable to start this meeting right now."));
    } finally {
      setHostStarting(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard not available");
      }

      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copied.`);
      window.setTimeout(() => {
        setCopyFeedback("");
      }, 2200);
    } catch {
      setCopyFeedback(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <>
      <div style={{ minHeight: "100vh", background: "var(--sm-bg)" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderRadius: 999,
              background: "var(--sm-bg-elev-2)",
              backdropFilter: "var(--sm-blur-md)",
              WebkitBackdropFilter: "var(--sm-blur-md)",
              boxShadow: "inset 0 0 0 1px var(--sm-line)",
            }}
          >
            <SmLogo size={24} withWordmark />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {user?.username ? (
                <span
                  style={{
                    fontSize: 13.5,
                    color: "var(--sm-fg-muted)",
                    letterSpacing: "-0.005em",
                  }}
                  className="sm-dashboard-username"
                >
                  {user.username}
                </span>
              ) : null}
              <SmButton variant="secondary" size="sm" icon="logout" onClick={handleLogout}>
                Sign out
              </SmButton>
            </div>
          </header>

          <main
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "56px 0",
            }}
          >
            <section style={{ width: "100%", maxWidth: 760 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <SmBadge tone="info" dot>
                  {dateFormatter.format(now)}
                </SmBadge>
              </div>
              <h1
                className="sm-h1"
                style={{
                  margin: 0,
                  textAlign: "center",
                  fontSize: "clamp(44px, 7vw, 72px)",
                  letterSpacing: "-0.035em",
                }}
              >
                {greeting}.
              </h1>
              <p
                style={{
                  margin: "12px auto 0",
                  textAlign: "center",
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "var(--sm-fg-muted)",
                  maxWidth: 520,
                }}
              >
                It's {timeFormatter.format(now)}. Start a new room or join one - your meetings
                stay private either way.
              </p>

              {createError ? (
                <div
                  role="alert"
                  style={{
                    margin: "24px auto 0",
                    maxWidth: 520,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "var(--sm-danger-soft)",
                    color: "var(--sm-danger)",
                    fontSize: 13.5,
                    textAlign: "left",
                  }}
                >
                  {createError}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 40,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                <ActionTile
                  title="New meeting"
                  description="Generate a private room with a unique code. Share access when you're ready."
                  icon="plus"
                  accent
                  onClick={handleCreateRoom}
                  disabled={createLoading}
                  loading={createLoading}
                />
                <ActionTile
                  title="Join meeting"
                  description="Enter a room code and password to step into the lobby."
                  icon="arrow"
                  onClick={openJoinModal}
                />
              </div>
            </section>
          </main>

          <footer
            style={{
              marginTop: "auto",
              padding: "14px 4px 8px",
              fontSize: 12.5,
              color: "var(--sm-fg-subtle)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>End-to-end encrypted · Rooms expire in 2 hours</span>
            <span>SecureMeet</span>
          </footer>
        </div>
      </div>

      {joinModalOpen ? (
        <ModalShell
          title="Join a meeting"
          description="Enter the room credentials and pick your pre-join settings."
          onClose={closeJoinModal}
        >
          <form
            onSubmit={handleJoinRoom}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <SmField
              id="join_room_code"
              label="Room code"
              autoComplete="off"
              value={joinRoomCode}
              onChange={(event) => setJoinRoomCode(event.target.value)}
              placeholder="e.g. 482-A3K"
              required
            />
            <SmField
              id="join_room_password"
              type="password"
              label="Room password"
              autoComplete="current-password"
              value={joinRoomPassword}
              onChange={(event) => setJoinRoomPassword(event.target.value)}
              placeholder="Shared by host"
              required
            />
            <SmField
              id="join_display_name"
              label="Nickname"
              value={joinDisplayName}
              onChange={(event) => setJoinDisplayName(event.target.value)}
              placeholder="How others see you"
              maxLength={64}
              required
            />

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <SmToggle
                label="Microphone"
                description="Connect to audio"
                checked={joinAudioEnabled}
                onChange={setJoinAudioEnabled}
              />
              <SmToggle
                label="Camera"
                description="Start with video"
                checked={joinVideoEnabled}
                onChange={setJoinVideoEnabled}
              />
            </div>

            {joinError ? (
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "var(--sm-danger-soft)",
                  color: "var(--sm-danger)",
                  fontSize: 13.5,
                }}
              >
                {joinError}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
              <SmButton
                type="button"
                variant="secondary"
                size="md"
                onClick={closeJoinModal}
                disabled={joinLoading}
              >
                Cancel
              </SmButton>
              <SmButton
                type="submit"
                variant="primary"
                size="md"
                disabled={joinLoading}
                icon="arrow"
                iconTrailing
              >
                {joinLoading ? "Joining…" : "Join"}
              </SmButton>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {createdRoom ? (
        <ModalShell
          title="Meeting created"
          description="Share the code and password now - the password is only shown here."
          onClose={closeHostModal}
        >
          <form
            onSubmit={handleStartMeeting}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <div style={credentialCardStyle}>
                <span className="sm-eyebrow" style={{ fontSize: 10.5 }}>
                  Room code
                </span>
                <span
                  className="sm-mono"
                  style={{ fontSize: 16, fontWeight: 600, color: "var(--sm-fg)" }}
                >
                  {createdRoom.room_code}
                </span>
                <button
                  type="button"
                  onClick={() => copyValue("Room code", createdRoom.room_code)}
                  className="sm-press"
                  style={{
                    marginTop: 6,
                    border: 0,
                    background: "transparent",
                    color: "var(--sm-accent)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <SmIcon name="copy" size={13} /> Copy
                </button>
              </div>
              <div style={credentialCardStyle}>
                <span className="sm-eyebrow" style={{ fontSize: 10.5 }}>
                  Password
                </span>
                <span
                  className="sm-mono"
                  style={{ fontSize: 16, fontWeight: 600, color: "var(--sm-fg)" }}
                >
                  {createdRoom.room_password}
                </span>
                <button
                  type="button"
                  onClick={() => copyValue("Room password", createdRoom.room_password)}
                  className="sm-press"
                  style={{
                    marginTop: 6,
                    border: 0,
                    background: "transparent",
                    color: "var(--sm-accent)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <SmIcon name="copy" size={13} /> Copy
                </button>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                color: "var(--sm-warn)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SmIcon name="clock" size={13} />
              Expires {new Date(createdRoom.expires_at).toLocaleString()}
            </p>

            {copyFeedback ? (
              <div
                role="status"
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--sm-success-soft)",
                  color: "var(--sm-success)",
                  fontSize: 12.5,
                }}
              >
                {copyFeedback}
              </div>
            ) : null}

            <SmField
              id="host_display_name"
              label="Nickname"
              value={hostDisplayName}
              onChange={(event) => setHostDisplayName(event.target.value)}
              placeholder="How attendees see you"
              maxLength={64}
              required
            />

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <SmToggle
                label="Microphone"
                description="Connect to audio"
                checked={hostAudioEnabled}
                onChange={setHostAudioEnabled}
              />
              <SmToggle
                label="Camera"
                description="Start with video"
                checked={hostVideoEnabled}
                onChange={setHostVideoEnabled}
              />
            </div>

            {hostError ? (
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "var(--sm-danger-soft)",
                  color: "var(--sm-danger)",
                  fontSize: 13.5,
                }}
              >
                {hostError}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
              <SmButton
                type="button"
                variant="secondary"
                size="md"
                onClick={closeHostModal}
                disabled={hostStarting}
              >
                Cancel
              </SmButton>
              <SmButton
                type="submit"
                variant="primary"
                size="md"
                disabled={hostStarting}
                icon="arrow"
                iconTrailing
              >
                {hostStarting ? "Starting…" : "Start meeting"}
              </SmButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}

export default DashboardPage;
