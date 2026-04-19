import { useCallback, useEffect, useRef, useState } from "react";

export type PeerConnectionSnapshot = {
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "new";
  error: string;
};

export type UseWebRtcPeersResult = {
  peerStates: Map<number, PeerConnectionSnapshot>;
  createPeerConnectionForUser: (
    userId: number,
    localStream: MediaStream | null,
    onIceCandidate: (event: RTCPeerConnectionIceEvent) => void
  ) => RTCPeerConnection | null;
  closePeerConnectionForUser: (userId: number) => void;
  closeAllPeerConnections: () => void;
  getPeerConnection: (userId: number) => RTCPeerConnection | null;
  getUsersWithPendingRemoteIceCandidates: () => number[];
  recordRemoteIceCandidate: (userId: number, candidate: RTCIceCandidateInit) => void;
  consumePendingRemoteIceCandidates: (userId: number) => RTCIceCandidateInit[];
  markOfferInitiated: (userId: number, initiated: boolean) => void;
  hasInitiatedOffer: (userId: number) => boolean;
  markAwaitingAnswer: (userId: number, awaiting: boolean) => void;
  isAwaitingAnswer: (userId: number) => boolean;
};

type PeerEntry = {
  peerConnection: RTCPeerConnection;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "new";
  error: string;
  hasReceivedRemoteMedia: boolean;
  fallbackRemoteStream: MediaStream | null;
  disconnectErrorTimeout: number | null;
  hasInitiatedOffer: boolean;
  isAwaitingAnswer: boolean;
};

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const DISCONNECTED_ERROR_DELAY_MS = 8000;

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

const isPeerConnectionReusable = (connection: RTCPeerConnection): boolean =>
  connection.connectionState !== "closed" &&
  connection.connectionState !== "failed" &&
  connection.iceConnectionState !== "failed";

const snapshotFromEntry = (entry: PeerEntry): PeerConnectionSnapshot => ({
  remoteStream: entry.remoteStream,
  connectionState: entry.connectionState,
  error: entry.error,
});

export const useWebRtcPeers = (): UseWebRtcPeersResult => {
  const peersRef = useRef<Map<number, PeerEntry>>(new Map());
  const pendingRemoteIceCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map());
  const [peerStates, setPeerStates] = useState<Map<number, PeerConnectionSnapshot>>(new Map());

  const publishPeerStates = useCallback(() => {
    const nextStates = new Map<number, PeerConnectionSnapshot>();
    for (const [userId, entry] of peersRef.current.entries()) {
      nextStates.set(userId, snapshotFromEntry(entry));
    }
    setPeerStates(nextStates);
  }, []);

  const clearDisconnectTimeout = useCallback((entry: PeerEntry) => {
    if (entry.disconnectErrorTimeout !== null) {
      window.clearTimeout(entry.disconnectErrorTimeout);
      entry.disconnectErrorTimeout = null;
    }
  }, []);

  const teardownPeerEntry = useCallback(
    (entry: PeerEntry) => {
      clearDisconnectTimeout(entry);
      const connection = entry.peerConnection;
      connection.ontrack = null;
      connection.onconnectionstatechange = null;
      connection.oniceconnectionstatechange = null;
      connection.onicecandidateerror = null;
      connection.onicecandidate = null;
      try {
        connection.close();
      } catch {
        // no-op; cleanup should continue even if close throws.
      }
    },
    [clearDisconnectTimeout]
  );

  const closePeerConnectionForUser = useCallback(
    (userId: number) => {
      const entry = peersRef.current.get(userId);

      // Pending remote ICE can exist even before a peer entry is created.
      // Always clear candidate buffers on explicit user cleanup.
      pendingRemoteIceCandidatesRef.current.delete(userId);

      if (!entry) {
        return;
      }

      teardownPeerEntry(entry);
      peersRef.current.delete(userId);
      publishPeerStates();
    },
    [publishPeerStates, teardownPeerEntry]
  );

  const closeAllPeerConnections = useCallback(() => {
    for (const entry of peersRef.current.values()) {
      teardownPeerEntry(entry);
    }
    peersRef.current.clear();
    pendingRemoteIceCandidatesRef.current.clear();
    publishPeerStates();
  }, [publishPeerStates, teardownPeerEntry]);

  const createPeerConnectionForUser = useCallback(
    (
      userId: number,
      localStream: MediaStream | null,
      onIceCandidate: (event: RTCPeerConnectionIceEvent) => void
    ): RTCPeerConnection | null => {
      const existingEntry = peersRef.current.get(userId);
      if (existingEntry && isPeerConnectionReusable(existingEntry.peerConnection)) {
        try {
          existingEntry.peerConnection.onicecandidate = onIceCandidate;
          addLocalTracks(existingEntry.peerConnection, localStream);
        } catch (error) {
          existingEntry.error = toRtcErrorMessage(error, "Failed to attach local media tracks.");
          publishPeerStates();
        }
        return existingEntry.peerConnection;
      }

      if (existingEntry) {
        teardownPeerEntry(existingEntry);
        peersRef.current.delete(userId);
      }

      let nextPeerConnection: RTCPeerConnection;
      try {
        nextPeerConnection = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      } catch (error) {
        console.error("Failed to construct RTCPeerConnection.", {
          userId,
          error: toRtcErrorMessage(error, "Failed to create WebRTC peer connection."),
        });
        return null;
      }

      const entry: PeerEntry = {
        peerConnection: nextPeerConnection,
        remoteStream: null,
        connectionState: nextPeerConnection.connectionState || "new",
        error: "",
        hasReceivedRemoteMedia: false,
        fallbackRemoteStream: null,
        disconnectErrorTimeout: null,
        hasInitiatedOffer: false,
        isAwaitingAnswer: false,
      };

      nextPeerConnection.ontrack = (event) => {
        const currentEntry = peersRef.current.get(userId);
        if (!currentEntry || currentEntry.peerConnection !== nextPeerConnection) {
          return;
        }

        currentEntry.hasReceivedRemoteMedia = true;
        clearDisconnectTimeout(currentEntry);
        currentEntry.error = "";

        const [stream] = event.streams;
        if (stream) {
          currentEntry.fallbackRemoteStream = stream;
          currentEntry.remoteStream = stream;
        } else {
          let fallbackStream = currentEntry.fallbackRemoteStream;
          if (!fallbackStream) {
            fallbackStream = new MediaStream();
            currentEntry.fallbackRemoteStream = fallbackStream;
          }
          fallbackStream.addTrack(event.track);
          currentEntry.remoteStream = fallbackStream;
        }

        publishPeerStates();
      };

      nextPeerConnection.onconnectionstatechange = () => {
        const currentEntry = peersRef.current.get(userId);
        if (!currentEntry || currentEntry.peerConnection !== nextPeerConnection) {
          return;
        }

        currentEntry.connectionState = nextPeerConnection.connectionState || "new";

        if (nextPeerConnection.connectionState === "failed") {
          clearDisconnectTimeout(currentEntry);
          currentEntry.error = "WebRTC connection failed for this participant.";
          publishPeerStates();
          return;
        }

        if (nextPeerConnection.connectionState === "closed") {
          clearDisconnectTimeout(currentEntry);
          currentEntry.remoteStream = null;
          publishPeerStates();
          return;
        }

        if (nextPeerConnection.connectionState === "connected") {
          clearDisconnectTimeout(currentEntry);
          if (currentEntry.hasReceivedRemoteMedia) {
            currentEntry.error = "";
          }
          publishPeerStates();
          return;
        }

        if (nextPeerConnection.connectionState !== "disconnected") {
          clearDisconnectTimeout(currentEntry);
          publishPeerStates();
          return;
        }

        clearDisconnectTimeout(currentEntry);
        currentEntry.disconnectErrorTimeout = window.setTimeout(() => {
          const latestEntry = peersRef.current.get(userId);
          if (!latestEntry || latestEntry.peerConnection !== nextPeerConnection) {
            return;
          }

          if (
            nextPeerConnection.connectionState === "disconnected" &&
            !latestEntry.hasReceivedRemoteMedia
          ) {
            latestEntry.error = "Remote media connection could not be established.";
            publishPeerStates();
          }
        }, DISCONNECTED_ERROR_DELAY_MS);

        publishPeerStates();
      };

      nextPeerConnection.oniceconnectionstatechange = () => {
        const currentEntry = peersRef.current.get(userId);
        if (!currentEntry || currentEntry.peerConnection !== nextPeerConnection) {
          return;
        }

        if (nextPeerConnection.iceConnectionState === "failed") {
          clearDisconnectTimeout(currentEntry);
          currentEntry.error = "Media network connectivity failed.";
          publishPeerStates();
        }
      };

      nextPeerConnection.onicecandidateerror = (event) => {
        console.warn("WebRTC ICE candidate gathering warning.", {
          userId,
          address: event.address,
          errorCode: event.errorCode,
          errorText: event.errorText,
          url: event.url,
        });
      };

      nextPeerConnection.onicecandidate = onIceCandidate;

      peersRef.current.set(userId, entry);

      try {
        addLocalTracks(nextPeerConnection, localStream);
      } catch (error) {
        entry.error = toRtcErrorMessage(error, "Failed to attach local media tracks.");
      }

      publishPeerStates();
      return nextPeerConnection;
    },
    [clearDisconnectTimeout, publishPeerStates, teardownPeerEntry]
  );

  const getPeerConnection = useCallback((userId: number): RTCPeerConnection | null => {
    const entry = peersRef.current.get(userId);
    if (!entry) {
      return null;
    }
    return entry.peerConnection;
  }, []);

  const getUsersWithPendingRemoteIceCandidates = useCallback((): number[] => {
    return Array.from(pendingRemoteIceCandidatesRef.current.keys());
  }, []);

  const recordRemoteIceCandidate = useCallback(
    (userId: number, candidate: RTCIceCandidateInit) => {
      const existing = pendingRemoteIceCandidatesRef.current.get(userId);
      if (existing) {
        existing.push(candidate);
        return;
      }
      pendingRemoteIceCandidatesRef.current.set(userId, [candidate]);
    },
    []
  );

  const consumePendingRemoteIceCandidates = useCallback(
    (userId: number): RTCIceCandidateInit[] => {
      const pending = pendingRemoteIceCandidatesRef.current.get(userId);
      if (!pending) {
        return [];
      }
      pendingRemoteIceCandidatesRef.current.delete(userId);
      return pending;
    },
    []
  );

  const markOfferInitiated = useCallback((userId: number, initiated: boolean) => {
    const entry = peersRef.current.get(userId);
    if (!entry) {
      return;
    }
    entry.hasInitiatedOffer = initiated;
  }, []);

  const hasInitiatedOffer = useCallback((userId: number): boolean => {
    const entry = peersRef.current.get(userId);
    return entry ? entry.hasInitiatedOffer : false;
  }, []);

  const markAwaitingAnswer = useCallback((userId: number, awaiting: boolean) => {
    const entry = peersRef.current.get(userId);
    if (!entry) {
      return;
    }
    entry.isAwaitingAnswer = awaiting;
  }, []);

  const isAwaitingAnswer = useCallback((userId: number): boolean => {
    const entry = peersRef.current.get(userId);
    return entry ? entry.isAwaitingAnswer : false;
  }, []);

  useEffect(() => {
    return () => {
      closeAllPeerConnections();
    };
  }, [closeAllPeerConnections]);

  return {
    peerStates,
    createPeerConnectionForUser,
    closePeerConnectionForUser,
    closeAllPeerConnections,
    getPeerConnection,
    getUsersWithPendingRemoteIceCandidates,
    recordRemoteIceCandidate,
    consumePendingRemoteIceCandidates,
    markOfferInitiated,
    hasInitiatedOffer,
    markAwaitingAnswer,
    isAwaitingAnswer,
  };
};
