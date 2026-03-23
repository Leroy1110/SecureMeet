import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { post } from "../lib/apiClient";
import type { RoomCreateResponse, RoomJoinResponse } from "../lib/types";
import { ROOM_SESSION_TOKEN_KEY } from "../lib/roomSession";

function DashboardPage() {
  const { token, user, clearToken } = useAuth();
  const navigate = useNavigate();
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState<RoomCreateResponse | null>(null);
  const [enterCreatedRoomLoading, setEnterCreatedRoomLoading] = useState(false);
  const [enterCreatedRoomError, setEnterCreatedRoomError] = useState("");

  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const handleLogout = () => {
    clearToken();
    localStorage.removeItem(ROOM_SESSION_TOKEN_KEY);
    navigate("/login");
  };

  const getRequestErrorMessage = (error: unknown, fallbackMessage: string): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallbackMessage;
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
    setCreateResult(null);
    setEnterCreatedRoomError("");

    try {
      const response = await post<RoomCreateResponse>("/rooms/", null, {
        Authorization: `Bearer ${token}`,
      });

      setCreateResult(response);
    } catch (creationError) {
      setCreateError(getRequestErrorMessage(creationError, "Unable to create room right now."));
    } finally {
      setCreateLoading(false);
    }
  };

  const joinRoomWithCredentials = async (roomCodeInput: string, roomPassword: string): Promise<string> => {
    if (!token) {
      throw new Error("Unauthorized. Please sign in again.");
    }

    const roomCode = roomCodeInput.trim();
    const response = await post<RoomJoinResponse>(
      "/rooms/join",
      {
        room_code: roomCode,
        room_password: roomPassword,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response.room_jwt) {
      throw new Error("Unable to join room right now.");
    }

    localStorage.setItem(ROOM_SESSION_TOKEN_KEY, response.room_jwt);
    return roomCode;
  };

  const handleJoinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (joinLoading) {
      return;
    }

    setJoinLoading(true);
    setJoinError("");

    try {
      const roomCode = await joinRoomWithCredentials(joinRoomCode, joinRoomPassword);
      setJoinRoomPassword("");
      navigate(`/rooms/${roomCode}`);
    } catch (joinRoomError) {
      setJoinError(getRequestErrorMessage(joinRoomError, "Unable to join room right now."));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleEnterCreatedRoom = async () => {
    if (enterCreatedRoomLoading || !createResult) {
      return;
    }

    setEnterCreatedRoomLoading(true);
    setEnterCreatedRoomError("");

    try {
      const roomCode = createResult.room_code.trim();
      const roomJwt = createResult.room_jwt?.trim() ?? "";

      if (!roomCode) {
        throw new Error("Missing room code for the created room.");
      }

      if (!roomJwt) {
        throw new Error("Missing room session token for the created room.");
      }

      localStorage.setItem(ROOM_SESSION_TOKEN_KEY, roomJwt);
      navigate(`/rooms/${roomCode}`);
    } catch (enterRoomError) {
      setEnterCreatedRoomError(
        getRequestErrorMessage(enterRoomError, "Unable to enter the created room right now.")
      );
    } finally {
      setEnterCreatedRoomLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Dashboard
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage your SecureMeet rooms from one place.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="h-11 rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                Logout
              </button>
            </div>

            {user?.username ? (
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Signed in as <span className="text-slate-900 dark:text-slate-100">{user.username}</span>
              </p>
            ) : null}
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Create Room
              </h2>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Generate a new private room code and one-time password.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={createLoading}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-black px-6 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-blue-900 dark:hover:bg-blue-800 dark:disabled:bg-slate-700"
            >
              {createLoading ? "Creating..." : "Create Room"}
            </button>

            {createError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                {createError}
              </p>
            ) : null}

            {createResult ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <p>
                  <strong>Room Code:</strong> {createResult.room_code}
                </p>
                <p>
                  <strong>Room Password:</strong> {createResult.room_password}
                </p>
                <p>
                  <strong>Expires At:</strong> {new Date(createResult.expires_at).toLocaleString()}
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  Save these details now. After entering the room, they will no longer be shown here.
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  The server returns the room password only once.
                </p>
                <button
                  type="button"
                  onClick={handleEnterCreatedRoom}
                  disabled={enterCreatedRoomLoading}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-blue-900 dark:hover:bg-blue-800 dark:disabled:bg-slate-700"
                >
                  {enterCreatedRoomLoading ? "Entering..." : "Enter room"}
                </button>
                {enterCreatedRoomError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                    {enterCreatedRoomError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Join Room
              </h2>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enter room credentials to join an active session.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="room_code"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Room Code
                </label>
                <input
                  id="room_code"
                  type="text"
                  autoComplete="off"
                  value={joinRoomCode}
                  onChange={(event) => setJoinRoomCode(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/80 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:bg-slate-800 dark:focus:ring-slate-700/60"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="room_password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Room Password
                </label>
                <input
                  id="room_password"
                  type="password"
                  autoComplete="current-password"
                  value={joinRoomPassword}
                  onChange={(event) => setJoinRoomPassword(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/80 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:bg-slate-800 dark:focus:ring-slate-700/60"
                />
              </div>

              <button
                type="submit"
                disabled={joinLoading}
                className="inline-flex h-12 items-center justify-center rounded-lg bg-black px-6 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-blue-900 dark:hover:bg-blue-800 dark:disabled:bg-slate-700"
              >
                {joinLoading ? "Joining..." : "Join Room"}
              </button>
            </form>

            {joinError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                {joinError}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
