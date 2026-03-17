import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { post } from "../lib/apiClient";
import type { RoomCreateResponse, RoomJoinResponse } from "../lib/types";

function DashboardPage() {
  const { token, user, clearToken } = useAuth();
  const navigate = useNavigate();
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState<RoomCreateResponse | null>(null);

  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [roomJwt, setRoomJwt] = useState<string | null>(null);

  const handleLogout = () => {
    clearToken();
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

  const handleJoinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (joinLoading) {
      return;
    }

    if (!token) {
      setJoinError("Unauthorized. Please sign in again.");
      return;
    }

    setJoinLoading(true);
    setJoinError("");
    setRoomJwt(null);

    try {
      const response = await post<RoomJoinResponse>(
        "/rooms/join",
        {
          room_code: joinRoomCode.trim(),
          room_password: joinRoomPassword,
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );

      setRoomJwt(response.room_jwt);
      setJoinRoomPassword("");
    } catch (joinRoomError) {
      setJoinError(getRequestErrorMessage(joinRoomError, "Unable to join room right now."));
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        This is where your SecureMeet rooms and activity will appear.
      </p>
      {user?.username && <p>Signed in as {user.username}</p>}
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white"
      >
        Logout
      </button>

      <section className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-xl font-semibold">Create Room</h2>
        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={createLoading}
          className="mt-3 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {createLoading ? "Creating..." : "Create Room"}
        </button>

        {createError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {createError}
          </p>
        ) : null}

        {createResult ? (
          <div className="mt-4 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
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
              Save the room password now. The server returns it only once.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-xl font-semibold">Join Room</h2>

        <form onSubmit={handleJoinRoom} className="mt-3 space-y-3">
          <div>
            <label htmlFor="room_code" className="mb-1 block text-sm font-medium">
              Room Code
            </label>
            <input
              id="room_code"
              type="text"
              autoComplete="off"
              value={joinRoomCode}
              onChange={(event) => setJoinRoomCode(event.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="room_password" className="mb-1 block text-sm font-medium">
              Room Password
            </label>
            <input
              id="room_password"
              type="password"
              autoComplete="current-password"
              value={joinRoomPassword}
              onChange={(event) => setJoinRoomPassword(event.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={joinLoading}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {joinLoading ? "Joining..." : "Join Room"}
          </button>
        </form>

        {joinError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {joinError}
          </p>
        ) : null}
        {roomJwt !== null ? (
          <p className="mt-3 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
            Join successful
          </p>
        ) : null}
      </section>
    </div>
  );
}

export default DashboardPage;
