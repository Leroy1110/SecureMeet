import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROOM_SESSION_TOKEN_KEY } from "../lib/roomSession";

function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const hasRoomSessionToken = Boolean(localStorage.getItem(ROOM_SESSION_TOKEN_KEY));

  useEffect(() => {
    if (!hasRoomSessionToken) {
      navigate("/dashboard");
    }
  }, [hasRoomSessionToken, navigate]);

  if (!hasRoomSessionToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Room Page</h1>
      <p>
        <strong>Room Code:</strong> {roomCode ?? "Unknown"}
      </p>
      <p>
        <strong>Room Session:</strong> {hasRoomSessionToken ? "Found" : "Missing"}
      </p>
    </div>
  );
}

export default RoomPage;
