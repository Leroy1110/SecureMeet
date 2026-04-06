import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
  year: "numeric",
});

type ActionTileProps = {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

const ActionTile = ({ title, description, onClick, disabled, children }: ActionTileProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="group flex min-h-48 w-full flex-col items-start justify-between rounded-3xl border border-slate-200 bg-white/90 p-6 text-left shadow-[0_20px_55px_-35px_rgba(15,23,42,0.4)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_25px_55px_-30px_rgba(15,23,42,0.45)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700"
  >
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300">
      Continue
    </span>
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
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_36px_80px_-42px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </header>
      <div className="mt-6">{children}</div>
    </div>
  </div>
);

type PreferenceToggleProps = {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (nextValue: boolean) => void;
};

const PreferenceToggle = ({ label, description, enabled, onToggle }: PreferenceToggleProps) => (
  <button
    type="button"
    onClick={() => onToggle(!enabled)}
    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
      enabled
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    }`}
  >
    <span>
      <span className="block text-sm font-semibold">{label}</span>
      <span className="block text-xs opacity-80">{description}</span>
    </span>
    <span
      className={`inline-flex h-6 w-11 rounded-full p-1 transition ${
        enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  </button>
);

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
  const greeting = user?.username ? `Welcome back, ${user.username}` : "Welcome back";

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
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(203,213,225,0.5),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(191,219,254,0.5),transparent_45%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(30,41,59,0.5),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(30,58,138,0.25),transparent_45%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
          <header className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 px-5 py-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/85">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                SecureMeet
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Meeting hub</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden text-sm font-medium text-slate-700 sm:block dark:text-slate-200">{greeting}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="flex flex-1 items-center justify-center py-8">
            <section className="w-full max-w-3xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Today
              </p>
              <h1 className="mt-4 text-6xl font-semibold tracking-tight text-slate-900 sm:text-7xl dark:text-slate-100">
                {timeFormatter.format(now)}
              </h1>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{dateFormatter.format(now)}</p>

              {createError ? (
                <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  {createError}
                </p>
              ) : null}

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <ActionTile
                  title="New meeting"
                  description="Create a private room and open your pre-join setup."
                  onClick={handleCreateRoom}
                  disabled={createLoading}
                >
                  {createLoading ? "…" : "+"}
                </ActionTile>
                <ActionTile
                  title="Join"
                  description="Enter room credentials and choose your pre-join preferences."
                  onClick={openJoinModal}
                >
                  →
                </ActionTile>
              </div>
            </section>
          </main>
        </div>
      </div>

      {joinModalOpen ? (
        <ModalShell title="Join meeting" description="Enter room credentials and pre-join settings." onClose={closeJoinModal}>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="join_room_code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room code
              </label>
              <input
                id="join_room_code"
                type="text"
                autoComplete="off"
                value={joinRoomCode}
                onChange={(event) => setJoinRoomCode(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="join_room_password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room password
              </label>
              <input
                id="join_room_password"
                type="password"
                autoComplete="current-password"
                value={joinRoomPassword}
                onChange={(event) => setJoinRoomPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="join_display_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nickname
              </label>
              <input
                id="join_display_name"
                type="text"
                value={joinDisplayName}
                onChange={(event) => setJoinDisplayName(event.target.value)}
                required
                maxLength={64}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreferenceToggle
                label="Microphone"
                description="Connect to audio"
                enabled={joinAudioEnabled}
                onToggle={setJoinAudioEnabled}
              />
              <PreferenceToggle
                label="Camera"
                description="Start with video"
                enabled={joinVideoEnabled}
                onToggle={setJoinVideoEnabled}
              />
            </div>

            {joinError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {joinError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeJoinModal}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={joinLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={joinLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                {joinLoading ? "Joining..." : "Join"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {createdRoom ? (
        <ModalShell
          title="Meeting created"
          description="Share the room code and password now. The password is shown only from this create response."
          onClose={closeHostModal}
        >
          <form onSubmit={handleStartMeeting} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room code</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{createdRoom.room_code}</p>
                <button
                  type="button"
                  onClick={() => copyValue("Room code", createdRoom.room_code)}
                  className="mt-2 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-300 dark:decoration-slate-600"
                >
                  Copy room code
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room password</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{createdRoom.room_password}</p>
                <button
                  type="button"
                  onClick={() => copyValue("Room password", createdRoom.room_password)}
                  className="mt-2 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-300 dark:decoration-slate-600"
                >
                  Copy room password
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-300">
              Expires at {new Date(createdRoom.expires_at).toLocaleString()}
            </p>

            {copyFeedback ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                {copyFeedback}
              </p>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="host_display_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nickname
              </label>
              <input
                id="host_display_name"
                type="text"
                value={hostDisplayName}
                onChange={(event) => setHostDisplayName(event.target.value)}
                required
                maxLength={64}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreferenceToggle
                label="Microphone"
                description="Connect to audio"
                enabled={hostAudioEnabled}
                onToggle={setHostAudioEnabled}
              />
              <PreferenceToggle
                label="Camera"
                description="Start with video"
                enabled={hostVideoEnabled}
                onToggle={setHostVideoEnabled}
              />
            </div>

            {hostError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {hostError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeHostModal}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={hostStarting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={hostStarting}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                {hostStarting ? "Starting..." : "Start meeting"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}

export default DashboardPage;
