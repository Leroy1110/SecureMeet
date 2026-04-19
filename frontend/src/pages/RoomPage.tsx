import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomControls from "../components/rooms/BottomControls";
import ChatPanel from "../components/rooms/ChatPanel";
import HostLeaveDialog from "../components/rooms/HostLeaveDialog";
import MeetingStage from "../components/rooms/MeetingStage";
import ParticipantsPanel from "../components/rooms/ParticipantsPanel";
import RoomDrawer from "../components/rooms/RoomDrawer";
import RoomHeader from "../components/rooms/RoomHeader";
import type { LocalMediaUiState, MeshUiState } from "../components/rooms/types";
import WaitingPanel from "../components/rooms/WaitingPanel";
import { useLocalMedia } from "../hooks/useLocalMedia";
import { type QueuedWebRtcSignal, type SessionStatus, useRoomSocket } from "../hooks/useRoomSocket";
import { useWebRtcPeers } from "../hooks/useWebRtcPeers";
import { ROOM_MEDIA_TOPOLOGY } from "../lib/mediaTopology";
import { getRoomEntryPreferences } from "../lib/roomEntryPreferences";

const getSessionStateContent = (status: SessionStatus): { title: string; description: string } => {
  switch (status) {
    case "waiting":
      return {
        title: "Waiting for host approval",
        description: "You are in the waiting lobby until the host approves your access.",
      };
    case "active":
      return {
        title: "Room session active",
        description: "You are connected to room presence and meeting features.",
      };
    case "rejected":
      return {
        title: "Access rejected",
        description: "Your join request was declined by the host.",
      };
    case "kicked":
      return {
        title: "Removed from room",
        description: "Your session was removed by the host.",
      };
    case "disconnected":
      return {
        title: "Session disconnected",
        description: "This session ended or was replaced by another connection.",
      };
    case "error":
      return {
        title: "Connection error",
        description: "Room connectivity encountered an error.",
      };
    case "unknown":
    default:
      return {
        title: "Connecting to room",
        description: "SecureMeet is establishing your room session.",
      };
  }
};

const formatStatusLabel = (value: string): string =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
};

type PanelKey = "active" | "waiting" | "chat";

function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const {
    activeUsers,
    canSendChat,
    canSendWebRtc,
    chatError,
    chatInput,
    chatMessages,
    chatRecipientOptions,
    displayedError,
    hasPrerequisites,
    hostActionError,
    hasHostActionPending,
    isFinalState,
    isHost,
    isSocketOpen,
    lastMessageType,
    queuedWebRtcSignals,
    localUserId,
    normalizedRoomCode,
    role,
    roomState,
    selectedRecipientUserId,
    consumeWebRtcSignal,
    sendChatMessage,
    sendHostKickAction,
    sendHostTransfer,
    sendHostWaitingAction,
    sendEndMeeting,
    sendWebRtcAnswer,
    sendWebRtcIceCandidate,
    sendWebRtcOffer,
    leaveRoom,
    sessionStatus,
    setSelectedRecipientFromValue,
    setChatInput,
    transportStatus,
    waitingUsers,
  } = useRoomSocket({ roomCode });

  const roomEntryPreferences = useMemo(
    () => getRoomEntryPreferences(normalizedRoomCode),
    [normalizedRoomCode]
  );
  const displayName = roomEntryPreferences?.displayName?.trim() || "Guest";
  const audioEnabled = roomEntryPreferences?.audioEnabled ?? true;
  const videoEnabled = roomEntryPreferences?.videoEnabled ?? true;
  const shouldStartLocalMedia = role === "host" || sessionStatus === "active";
  const preferencesMediaDisabled = !audioEnabled && !videoEnabled;

  const processingSignalPeersRef = useRef<Set<number>>(new Set());
  const pendingOfferInitiationsRef = useRef<Set<number>>(new Set());

  const [rtcFlowError, setRtcFlowError] = useState("");
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isHostLeaveDialogOpen, setIsHostLeaveDialogOpen] = useState(false);
  const pendingLeaveAfterTransferRef = useRef(false);

  const {
    localStream,
    mediaLoading,
    mediaError,
    mediaReady,
    mediaDisabled,
    startLocalMedia,
    stopLocalMedia,
  } = useLocalMedia();

  const {
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
  } = useWebRtcPeers();

  const buildIceCandidateHandler = useCallback(
    (targetUserId: number) => {
      return (event: RTCPeerConnectionIceEvent) => {
        if (!event.candidate) {
          return;
        }

        const candidate = event.candidate.toJSON();
        const didSendCandidate = sendWebRtcIceCandidate(targetUserId, candidate);
        if (!didSendCandidate) {
          setRtcFlowError("Unable to send WebRTC ICE candidate.");
        }
      };
    },
    [sendWebRtcIceCandidate]
  );

  const hasLocalVideoTrack = Boolean(localStream?.getVideoTracks().length);
  const hasLocalAudioTrack = Boolean(localStream?.getAudioTracks().length);

  const displayedRtcError = rtcFlowError;

  const availableActivePeerUserIds = useMemo(
    () =>
      activeUsers
        .map((user) => user.userId)
        .filter((userId): userId is number => userId !== null && userId > 0)
        .sort((left, right) => left - right),
    [activeUsers]
  );

  const availableRtcTargetUserIds = useMemo(
    () => availableActivePeerUserIds.filter((userId) => userId !== localUserId),
    [availableActivePeerUserIds, localUserId]
  );

  const localMediaUiState: LocalMediaUiState = useMemo(() => {
    if (!shouldStartLocalMedia) {
      return "not_started";
    }

    if (mediaDisabled || preferencesMediaDisabled) {
      return "disabled_by_preferences";
    }

    if (mediaLoading) {
      return "requesting_permissions";
    }

    if (mediaError) {
      return "failed";
    }

    if (hasLocalAudioTrack && hasLocalVideoTrack) {
      return "ready_audio_video";
    }

    if (hasLocalAudioTrack) {
      return "ready_audio_only";
    }

    if (hasLocalVideoTrack) {
      return "ready_video_only";
    }

    if (mediaReady) {
      return "ready_audio_video";
    }

    return "not_started";
  }, [
    hasLocalAudioTrack,
    hasLocalVideoTrack,
    mediaDisabled,
    mediaError,
    mediaLoading,
    mediaReady,
    preferencesMediaDisabled,
    shouldStartLocalMedia,
  ]);

  const hasRtcNegotiationPrerequisites = useMemo(() => {
    if (!canSendWebRtc || !isSocketOpen || isFinalState) {
      return false;
    }

    if (!shouldStartLocalMedia) {
      return true;
    }

    if (mediaLoading) {
      return false;
    }

    if (preferencesMediaDisabled || mediaDisabled || mediaReady || Boolean(mediaError)) {
      return true;
    }

    return localStream !== null;
  }, [
    canSendWebRtc,
    isFinalState,
    isSocketOpen,
    localStream,
    mediaDisabled,
    mediaError,
    mediaLoading,
    mediaReady,
    preferencesMediaDisabled,
    shouldStartLocalMedia,
  ]);

  const meshUiState: MeshUiState = useMemo(() => {
    if (ROOM_MEDIA_TOPOLOGY !== "mesh") {
      if (!canSendWebRtc || !isSocketOpen || localUserId === null || isFinalState) {
        return "idle";
      }
      return "connecting";
    }

    if (displayedRtcError) {
      return "failed";
    }

    if (!canSendWebRtc || !isSocketOpen || localUserId === null || isFinalState) {
      return "idle";
    }

    if (availableRtcTargetUserIds.length === 0) {
      return "waiting_for_peers";
    }

    if (localMediaUiState === "requesting_permissions") {
      return "preparing_local_media";
    }

    let connectedCount = 0;
    let failedCount = 0;
    let connectingCount = 0;
    for (const userId of availableRtcTargetUserIds) {
      const snapshot = peerStates.get(userId);
      if (!snapshot) {
        connectingCount += 1;
        continue;
      }
      if (snapshot.connectionState === "connected") {
        connectedCount += 1;
      } else if (snapshot.connectionState === "failed") {
        failedCount += 1;
      } else {
        connectingCount += 1;
      }
    }

    if (connectedCount === availableRtcTargetUserIds.length) {
      return "connected";
    }

    if (failedCount > 0 && connectedCount === 0 && connectingCount === 0) {
      return "failed";
    }

    if (connectedCount > 0) {
      return "partially_connected";
    }

    return "connecting";
  }, [
    availableRtcTargetUserIds,
    canSendWebRtc,
    displayedRtcError,
    isFinalState,
    isSocketOpen,
    localMediaUiState,
    localUserId,
    peerStates,
  ]);

  const flushPendingIceCandidates = useCallback(
    async (peerConnection: RTCPeerConnection, userId: number) => {
      if (!peerConnection.remoteDescription) {
        return;
      }

      const pendingCandidates = consumePendingRemoteIceCandidates(userId);
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
    },
    [consumePendingRemoteIceCandidates]
  );

  const resetMeshFlowState = useCallback(() => {
    processingSignalPeersRef.current.clear();
    pendingOfferInitiationsRef.current.clear();
    setRtcFlowError("");
  }, []);

  const doLeaveRoom = useCallback(() => {
    resetMeshFlowState();
    closeAllPeerConnections();
    stopLocalMedia();
    leaveRoom();
    navigate("/dashboard", { replace: true });
  }, [closeAllPeerConnections, leaveRoom, navigate, resetMeshFlowState, stopLocalMedia]);

  const handleLeaveRoom = useCallback(() => {
    if (isHost && !isFinalState) {
      setIsHostLeaveDialogOpen(true);
      return;
    }

    doLeaveRoom();
  }, [doLeaveRoom, isFinalState, isHost]);

  const handleTransferAndLeave = useCallback((toUserId: number) => {
    const didRequestTransfer = sendHostTransfer(toUserId);
    setIsHostLeaveDialogOpen(false);
    if (!didRequestTransfer) {
      return;
    }
    pendingLeaveAfterTransferRef.current = true;
  }, [sendHostTransfer]);

  const handleEndMeeting = useCallback(() => {
    setIsHostLeaveDialogOpen(false);
    resetMeshFlowState();
    closeAllPeerConnections();
    stopLocalMedia();
    sendEndMeeting();
  }, [closeAllPeerConnections, resetMeshFlowState, sendEndMeeting, stopLocalMedia]);

  const handleMakeHost = useCallback((userId: number) => {
    sendHostTransfer(userId);
  }, [sendHostTransfer]);

  useEffect(() => {
    if (!hasPrerequisites) {
      navigate("/dashboard", { replace: true });
    }
  }, [hasPrerequisites, navigate]);

  useEffect(() => {
    if (!shouldStartLocalMedia) {
      stopLocalMedia();
      return;
    }

    void startLocalMedia({ audioEnabled, videoEnabled });
  }, [audioEnabled, shouldStartLocalMedia, startLocalMedia, stopLocalMedia, videoEnabled]);

  useEffect(() => {
    if (isFinalState && activePanel !== null) {
      setActivePanel(null);
    }
  }, [activePanel, isFinalState]);

  useEffect(() => {
    if (pendingLeaveAfterTransferRef.current && !isHost) {
      pendingLeaveAfterTransferRef.current = false;
      doLeaveRoom();
    }
  }, [doLeaveRoom, isHost]);

  useEffect(() => {
    const processingSignalPeers = processingSignalPeersRef.current;
    const pendingOfferInitiations = pendingOfferInitiationsRef.current;
    return () => {
      processingSignalPeers.clear();
      pendingOfferInitiations.clear();
      closeAllPeerConnections();
      stopLocalMedia();
    };
  }, [closeAllPeerConnections, stopLocalMedia]);

  useEffect(() => {
    const pendingIceCandidateUserIds = getUsersWithPendingRemoteIceCandidates();

    if (ROOM_MEDIA_TOPOLOGY !== "mesh") {
      pendingOfferInitiationsRef.current.clear();
      if (peerStates.size > 0 || pendingIceCandidateUserIds.length > 0) {
        closeAllPeerConnections();
      }
      return;
    }

    if (!canSendWebRtc || !isSocketOpen || isFinalState || localUserId === null) {
      pendingOfferInitiationsRef.current.clear();
      // Only close connections when there are entries to close; unconditional
      // closeAllPeerConnections() always publishes a new Map reference which
      // re-triggers this effect (peerStates dep), creating a render loop while
      // the room is in a non-RTC state.
      if (peerStates.size > 0 || pendingIceCandidateUserIds.length > 0) {
        closeAllPeerConnections();
      }
      return;
    }

    const activeSet = new Set(availableRtcTargetUserIds);

    const trackedPeerIds = new Set<number>([
      ...peerStates.keys(),
      ...pendingOfferInitiationsRef.current,
      ...pendingIceCandidateUserIds,
    ]);
    for (const trackedUserId of trackedPeerIds) {
      if (!activeSet.has(trackedUserId)) {
        closePeerConnectionForUser(trackedUserId);
        pendingOfferInitiationsRef.current.delete(trackedUserId);
      }
    }

    if (!hasRtcNegotiationPrerequisites) {
      return;
    }

    for (const targetUserId of availableRtcTargetUserIds) {
      if (localUserId >= targetUserId) {
        continue;
      }

      if (pendingOfferInitiationsRef.current.has(targetUserId)) {
        continue;
      }

      // Failed/closed/disconnected entries are stale for this initiator loop.
      // Same-user reconnects often leave a previous connection in
      // "disconnected", and with lower-ID-initiates we can otherwise miss
      // renegotiation for an extended period.
      const existingSnapshot = peerStates.get(targetUserId);
      const isStale =
        existingSnapshot !== undefined &&
        (existingSnapshot.connectionState === "failed" ||
          existingSnapshot.connectionState === "closed" ||
          existingSnapshot.connectionState === "disconnected");

      if (existingSnapshot && !isStale) {
        // Healthy entry (new / connecting / connected) — skip.
        continue;
      }

      if (isStale) {
        closePeerConnectionForUser(targetUserId);
      }

      const peerConnection = createPeerConnectionForUser(
        targetUserId,
        localStream,
        buildIceCandidateHandler(targetUserId)
      );

      if (!peerConnection) {
        setRtcFlowError(`Unable to initialize WebRTC connection to user ${targetUserId}.`);
        continue;
      }

      if (peerConnection.signalingState !== "stable") {
        continue;
      }

      if (hasInitiatedOffer(targetUserId) || isAwaitingAnswer(targetUserId)) {
        continue;
      }

      pendingOfferInitiationsRef.current.add(targetUserId);
      markOfferInitiated(targetUserId, true);
      markAwaitingAnswer(targetUserId, true);

      void (async () => {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          const localSdp = peerConnection.localDescription?.sdp;
          if (typeof localSdp !== "string" || localSdp.length === 0) {
            throw new Error("Failed to create local WebRTC offer.");
          }

          const didSendOffer = sendWebRtcOffer(targetUserId, localSdp);
          if (!didSendOffer) {
            markOfferInitiated(targetUserId, false);
            markAwaitingAnswer(targetUserId, false);
            setRtcFlowError("Unable to send WebRTC offer to a remote participant.");
            return;
          }
        } catch (error) {
          markOfferInitiated(targetUserId, false);
          markAwaitingAnswer(targetUserId, false);
          setRtcFlowError(toErrorMessage(error, "Failed to create or send a WebRTC offer."));
        } finally {
          pendingOfferInitiationsRef.current.delete(targetUserId);
        }
      })();
    }
  }, [
    availableRtcTargetUserIds,
    buildIceCandidateHandler,
    canSendWebRtc,
    closeAllPeerConnections,
    closePeerConnectionForUser,
    createPeerConnectionForUser,
    getUsersWithPendingRemoteIceCandidates,
    hasInitiatedOffer,
    hasRtcNegotiationPrerequisites,
    isAwaitingAnswer,
    isFinalState,
    isSocketOpen,
    localStream,
    localUserId,
    markAwaitingAnswer,
    markOfferInitiated,
    peerStates,
    sendWebRtcOffer,
  ]);

  useEffect(() => {
    if (ROOM_MEDIA_TOPOLOGY !== "mesh") {
      return;
    }

    if (
      queuedWebRtcSignals.length === 0 ||
      !canSendWebRtc ||
      !isSocketOpen ||
      isFinalState ||
      localUserId === null
    ) {
      return;
    }

    const resolveSignalTarget = (signal: QueuedWebRtcSignal): number | null => {
      if (signal.toUserId !== null && signal.toUserId !== localUserId) {
        return null;
      }

      if (!availableRtcTargetUserIds.includes(signal.fromUserId)) {
        return null;
      }

      return signal.fromUserId;
    };

    for (const queuedSignal of queuedWebRtcSignals) {
      const fromUserId = resolveSignalTarget(queuedSignal);
      if (fromUserId === null) {
        consumeWebRtcSignal(queuedSignal.queueId);
        continue;
      }

      if (processingSignalPeersRef.current.has(fromUserId)) {
        continue;
      }

      processingSignalPeersRef.current.add(fromUserId);
      let shouldConsumeSignal = false;

      void (async () => {
        try {
          switch (queuedSignal.type) {
            case "webrtc.offer": {
              if (!hasRtcNegotiationPrerequisites) {
                return;
              }

              if (localUserId < fromUserId) {
                shouldConsumeSignal = true;
                return;
              }

              const remoteSdp = queuedSignal.sdp;
              if (typeof remoteSdp !== "string" || remoteSdp.length === 0) {
                shouldConsumeSignal = true;
                return;
              }

              const peerConnection = createPeerConnectionForUser(
                fromUserId,
                localStream,
                buildIceCandidateHandler(fromUserId)
              );

              if (!peerConnection) {
                shouldConsumeSignal = true;
                setRtcFlowError(
                  `Unable to initialize WebRTC connection to user ${fromUserId}.`
                );
                return;
              }

              if (
                peerConnection.signalingState !== "stable" &&
                peerConnection.signalingState !== "have-remote-offer"
              ) {
                return;
              }

              await peerConnection.setRemoteDescription({
                type: "offer",
                sdp: remoteSdp,
              });
              await flushPendingIceCandidates(peerConnection, fromUserId);

              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              const localSdp = peerConnection.localDescription?.sdp;
              if (typeof localSdp !== "string" || localSdp.length === 0) {
                throw new Error("Failed to create local WebRTC answer.");
              }

              const didSendAnswer = sendWebRtcAnswer(fromUserId, localSdp);
              if (!didSendAnswer) {
                shouldConsumeSignal = true;
                setRtcFlowError("Unable to send WebRTC answer to a remote participant.");
                return;
              }

              shouldConsumeSignal = true;
              break;
            }
            case "webrtc.answer": {
              const peerConnection = getPeerConnection(fromUserId);
              if (!peerConnection) {
                shouldConsumeSignal = true;
                return;
              }

              const remoteSdp = queuedSignal.sdp;
              if (typeof remoteSdp !== "string" || remoteSdp.length === 0) {
                shouldConsumeSignal = true;
                return;
              }

              if (
                !isAwaitingAnswer(fromUserId) ||
                peerConnection.signalingState !== "have-local-offer"
              ) {
                shouldConsumeSignal = true;
                return;
              }

              await peerConnection.setRemoteDescription({
                type: "answer",
                sdp: remoteSdp,
              });
              await flushPendingIceCandidates(peerConnection, fromUserId);
              markAwaitingAnswer(fromUserId, false);
              shouldConsumeSignal = true;
              break;
            }
            case "webrtc.ice_candidate": {
              const candidate = queuedSignal.candidate;
              if (!candidate) {
                shouldConsumeSignal = true;
                return;
              }

              const peerConnection = getPeerConnection(fromUserId);
              if (!peerConnection || !peerConnection.remoteDescription) {
                recordRemoteIceCandidate(fromUserId, candidate);
                shouldConsumeSignal = true;
                return;
              }

              await peerConnection.addIceCandidate(candidate);
              shouldConsumeSignal = true;
              break;
            }
            default:
              shouldConsumeSignal = true;
              break;
          }
        } catch (error) {
          shouldConsumeSignal = true;
          markAwaitingAnswer(fromUserId, false);
          setRtcFlowError(toErrorMessage(error, "Failed to apply incoming WebRTC signaling data."));
        } finally {
          processingSignalPeersRef.current.delete(fromUserId);
          if (shouldConsumeSignal) {
            consumeWebRtcSignal(queuedSignal.queueId);
          }
        }
      })();
    }
  }, [
    availableRtcTargetUserIds,
    buildIceCandidateHandler,
    canSendWebRtc,
    consumeWebRtcSignal,
    createPeerConnectionForUser,
    flushPendingIceCandidates,
    getPeerConnection,
    hasRtcNegotiationPrerequisites,
    isAwaitingAnswer,
    isFinalState,
    isSocketOpen,
    localStream,
    localUserId,
    markAwaitingAnswer,
    queuedWebRtcSignals,
    recordRemoteIceCandidate,
    sendWebRtcAnswer,
  ]);

  if (!hasPrerequisites) {
    return null;
  }

  const sessionContent = getSessionStateContent(sessionStatus);

  return (
    <div className="min-h-screen bg-slate-50 pb-4 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <RoomHeader
          roomCode={normalizedRoomCode}
          displayName={displayName}
          roleLabel={role ? formatStatusLabel(role) : "Unknown role"}
          connectionLabel={formatStatusLabel(transportStatus)}
          sessionLabel={formatStatusLabel(sessionStatus)}
          onLeave={handleLeaveRoom}
        />

        {displayedError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
            {displayedError}
          </p>
        ) : null}

        {mediaError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/50 dark:text-amber-300">
            {mediaError}
          </p>
        ) : null}

        {displayedRtcError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
            {displayedRtcError}
          </p>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">{sessionContent.title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sessionContent.description}</p>
        </div>

        <MeetingStage
          activeUsers={activeUsers}
          localUserId={localUserId}
          localDisplayName={displayName}
          localStream={localStream}
          hasLocalVideoTrack={hasLocalVideoTrack}
          hasLocalAudioTrack={hasLocalAudioTrack}
          localMediaUiState={localMediaUiState}
          peerStates={peerStates}
          meshUiState={meshUiState}
          mediaTopology={ROOM_MEDIA_TOPOLOGY}
        />

        {isFinalState ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
            >
              Return to dashboard
            </button>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setIsDebugOpen((previousValue) => !previousValue)}
            className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {isDebugOpen ? "Hide" : "Show"} debug details
          </button>
          {isDebugOpen ? (
            <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                Last message: {lastMessageType || "None"}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                Room state: {roomState || "Unknown"}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                Mesh peers: {peerStates.size}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                Mesh state: {formatStatusLabel(meshUiState)}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                Topology: {ROOM_MEDIA_TOPOLOGY}
              </p>
            </div>
          ) : null}
        </div>

        <BottomControls
          activeCount={activeUsers.length}
          waitingCount={waitingUsers.length}
          isHost={isHost}
          onOpenActive={() => setActivePanel("active")}
          onOpenWaiting={() => setActivePanel("waiting")}
          onOpenChat={() => setActivePanel("chat")}
          onLeave={handleLeaveRoom}
        />
      </div>

      <RoomDrawer
        isOpen={activePanel === "active"}
        title="Active participants"
        description="Connected room members and mesh status"
        onClose={() => setActivePanel(null)}
      >
        <ParticipantsPanel
          activeUsers={activeUsers}
          localUserId={localUserId}
          peerStates={peerStates}
          isHost={isHost}
          onMakeHost={handleMakeHost}
        />
      </RoomDrawer>

      <RoomDrawer
        isOpen={activePanel === "waiting" && isHost}
        title="Waiting participants"
        description="Approve, reject, and moderate waiting requests"
        onClose={() => setActivePanel(null)}
      >
        <WaitingPanel
          waitingUsers={waitingUsers}
          hostActionError={hostActionError}
          hasHostActionPending={hasHostActionPending}
          onApprove={(userId) => sendHostWaitingAction("waiting.approve", userId)}
          onReject={(userId) => sendHostWaitingAction("waiting.reject", userId)}
        />
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Active moderation</p>
          <ul className="space-y-2">
            {activeUsers.map((user) => {
              const userId = user.userId;
              const canKick = userId !== null && userId !== localUserId;
              const userLabel = user.label || (userId !== null ? `User ${userId}` : "Unknown user");

              return (
                <li
                  key={userId !== null ? String(userId) : userLabel}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="text-sm text-slate-800 dark:text-slate-100">{userLabel}</p>
                  {canKick ? (
                    <button
                      type="button"
                      onClick={() => sendHostKickAction(userId)}
                      disabled={hasHostActionPending}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      Kick
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </RoomDrawer>

      <RoomDrawer
        isOpen={activePanel === "chat"}
        title="Room chat"
        description="Public and private messaging for active room users"
        onClose={() => setActivePanel(null)}
      >
        <ChatPanel
          chatMessages={chatMessages}
          chatError={chatError}
          canSendChat={canSendChat}
          isSocketOpen={isSocketOpen}
          selectedRecipientUserId={selectedRecipientUserId}
          chatRecipientOptions={chatRecipientOptions}
          chatInput={chatInput}
          setSelectedRecipientFromValue={setSelectedRecipientFromValue}
          setChatInput={setChatInput}
          onSubmit={sendChatMessage}
        />
      </RoomDrawer>

      <HostLeaveDialog
        isOpen={isHostLeaveDialogOpen}
        activeUsers={activeUsers}
        localUserId={localUserId}
        onTransferAndLeave={handleTransferAndLeave}
        onEndMeeting={handleEndMeeting}
        onCancel={() => setIsHostLeaveDialogOpen(false)}
      />
    </div>
  );
}

export default RoomPage;
