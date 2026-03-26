import { useCallback, useEffect, useRef, useState } from "react";

export type UseWebRtcPeerResult = {
  peerConnection: RTCPeerConnection | null;
  remoteStream: MediaStream | null;
  rtcError: string;
  rtcConnectionState: RTCPeerConnectionState | "new";
  createPeerConnection: (localStream: MediaStream | null) => RTCPeerConnection | null;
  closePeerConnection: () => void;
};

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

const toRtcErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
};

const addLocalTracks = (peerConnection: RTCPeerConnection, localStream: MediaStream | null): void => {
  if (!localStream) {
    return;
  }

  const existingTrackIds = new Set(
    peerConnection
      .getSenders()
      .map((sender) => sender.track?.id)
      .filter((trackId): trackId is string => Boolean(trackId))
  );

  for (const track of localStream.getTracks()) {
    if (existingTrackIds.has(track.id)) {
      continue;
    }

    peerConnection.addTrack(track, localStream);
    existingTrackIds.add(track.id);
  }
};

export const useWebRtcPeer = (): UseWebRtcPeerResult => {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [rtcError, setRtcError] = useState("");
  const [rtcConnectionState, setRtcConnectionState] = useState<RTCPeerConnectionState | "new">("new");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const fallbackRemoteStreamRef = useRef<MediaStream | null>(null);

  const isPeerConnectionReusable = (connection: RTCPeerConnection): boolean =>
    connection.connectionState !== "closed" &&
    connection.connectionState !== "failed" &&
    connection.iceConnectionState !== "failed";

  const closePeerConnection = useCallback(() => {
    const currentPeerConnection = peerConnectionRef.current;
    peerConnectionRef.current = null;

    if (currentPeerConnection) {
      currentPeerConnection.ontrack = null;
      currentPeerConnection.onconnectionstatechange = null;
      currentPeerConnection.oniceconnectionstatechange = null;
      currentPeerConnection.onicecandidateerror = null;
      currentPeerConnection.onicecandidate = null;

      try {
        currentPeerConnection.close();
      } catch {
        // no-op; cleanup should continue even if close throws.
      }
    }

    fallbackRemoteStreamRef.current = null;
    setPeerConnection(null);
    setRemoteStream(null);
    setRtcError("");
    setRtcConnectionState("new");
  }, []);

  const createPeerConnection = useCallback(
    (localStream: MediaStream | null): RTCPeerConnection | null => {
      const existingPeerConnection = peerConnectionRef.current;
      if (existingPeerConnection && isPeerConnectionReusable(existingPeerConnection)) {
        try {
          addLocalTracks(existingPeerConnection, localStream);
        } catch (error) {
          setRtcError(toRtcErrorMessage(error, "Failed to attach local media tracks."));
        }
        return existingPeerConnection;
      }

      if (existingPeerConnection) {
        closePeerConnection();
      }

      try {
        const nextPeerConnection = new RTCPeerConnection({
          iceServers: DEFAULT_ICE_SERVERS,
        });

        peerConnectionRef.current = nextPeerConnection;
        setPeerConnection(nextPeerConnection);
        setRemoteStream(null);
        setRtcError("");
        setRtcConnectionState(nextPeerConnection.connectionState || "new");

        nextPeerConnection.ontrack = (event) => {
          const [stream] = event.streams;
          if (stream) {
            fallbackRemoteStreamRef.current = stream;
            setRemoteStream(stream);
            return;
          }

          let fallbackStream = fallbackRemoteStreamRef.current;
          if (!fallbackStream) {
            fallbackStream = new MediaStream();
            fallbackRemoteStreamRef.current = fallbackStream;
          }

          fallbackStream.addTrack(event.track);
          setRemoteStream(fallbackStream);
        };

        nextPeerConnection.onconnectionstatechange = () => {
          setRtcConnectionState(nextPeerConnection.connectionState || "new");
          if (nextPeerConnection.connectionState === "failed") {
            setRtcError("WebRTC connection failed. Please try leaving and rejoining the room.");
          }
        };

        nextPeerConnection.oniceconnectionstatechange = () => {
          if (nextPeerConnection.iceConnectionState === "failed") {
            setRtcError("Media network connectivity failed.");
          }
        };

        nextPeerConnection.onicecandidateerror = () => {
          setRtcError("Unable to gather media network candidates.");
        };

        addLocalTracks(nextPeerConnection, localStream);
        return nextPeerConnection;
      } catch (error) {
        setRtcError(toRtcErrorMessage(error, "Failed to create WebRTC peer connection."));
        return null;
      }
    },
    [closePeerConnection]
  );

  useEffect(() => {
    return () => {
      closePeerConnection();
    };
  }, [closePeerConnection]);

  return {
    peerConnection,
    remoteStream,
    rtcError,
    rtcConnectionState,
    createPeerConnection,
    closePeerConnection,
  };
};
