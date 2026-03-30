import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BottomControls from "../components/rooms/BottomControls";
import ChatPanel from "../components/rooms/ChatPanel";
import MeetingStage from "../components/rooms/MeetingStage";
import ParticipantsPanel from "../components/rooms/ParticipantsPanel";
import RoomDrawer from "../components/rooms/RoomDrawer";
import RoomHeader from "../components/rooms/RoomHeader";
import type { LocalMediaUiState, RemoteUiState, RtcUiState } from "../components/rooms/types";
import WaitingPanel from "../components/rooms/WaitingPanel";
import { useLocalMedia } from "../hooks/useLocalMedia";
import { type SessionStatus, useRoomSocket } from "../hooks/useRoomSocket";
import { useWebRtcPeer } from "../hooks/useWebRtcPeer";
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
    hostActionPendingKey,
    isFinalState,
    isHost,
    isSocketOpen,
    lastMessageType,
    lastWebRtcSignal,
    localUserId,
    normalizedRoomCode,
    role,
    roomState,
    selectedRecipientUserId,
    sendChatMessage,
    sendHostKickAction,
    sendHostWaitingAction,
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

  const activeRtcPeerUserIdRef = useRef<number | null>(null);
  const pendingRemoteIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasInitiatedOfferRef = useRef(false);

  const [rtcFlowError, setRtcFlowError] = useState("");
  const [rtcTargetUserId, setRtcTargetUserId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

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
    remoteStream,
    rtcError,
    rtcConnectionState,
    createPeerConnection,
    closePeerConnection,
  } = useWebRtcPeer();

  const buildIceCandidateHandler = useCallback(
    (targetUserId: number | null) => {
      if (targetUserId === null) {
        return null;
      }

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
  const hasRemoteVideoTrack = Boolean(remoteStream?.getVideoTracks().length);
  const hasRemoteAudioTrack = Boolean(remoteStream?.getAudioTracks().length);

  const displayedRtcError = rtcFlowError || rtcError;

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

  const rtcUiState: RtcUiState = useMemo(() => {
    if (displayedRtcError || rtcConnectionState === "failed") {
      return "failed";
    }

    if (!canSendWebRtc || !isSocketOpen || localUserId === null || isFinalState) {
      return "idle";
    }

    if (availableRtcTargetUserIds.length === 0 || rtcTargetUserId === null) {
      return "waiting_for_peer";
    }

    if (localMediaUiState === "requesting_permissions") {
      return "preparing_local_media";
    }

    if (rtcConnectionState === "connecting" || rtcConnectionState === "new") {
      return "connecting";
    }

    if (rtcConnectionState === "connected") {
      return "connected";
    }

    if (rtcConnectionState === "disconnected") {
      return "connecting";
    }

    return "ready_to_connect";
  }, [
    availableRtcTargetUserIds.length,
    canSendWebRtc,
    displayedRtcError,
    isFinalState,
    isSocketOpen,
    localMediaUiState,
    localUserId,
    rtcConnectionState,
    rtcTargetUserId,
  ]);

  const remoteUiState: RemoteUiState = useMemo(() => {
    if (displayedRtcError || rtcConnectionState === "failed") {
      return "failed";
    }

    if (rtcTargetUserId === null) {
      return "no_peer_selected";
    }

    if (!availableRtcTargetUserIds.includes(rtcTargetUserId) || rtcConnectionState === "disconnected") {
      return "remote_disconnected";
    }

    if (hasRemoteVideoTrack) {
      return "video_active";
    }

    if (hasRemoteAudioTrack) {
      return "audio_only";
    }

    if (rtcConnectionState === "connecting" || rtcConnectionState === "new") {
      return "connecting";
    }

    return "waiting_for_remote";
  }, [
    availableRtcTargetUserIds,
    displayedRtcError,
    hasRemoteAudioTrack,
    hasRemoteVideoTrack,
    rtcConnectionState,
    rtcTargetUserId,
  ]);

  const resetRtcFlowState = useCallback(() => {
    activeRtcPeerUserIdRef.current = null;
    pendingRemoteIceCandidatesRef.current = [];
    hasInitiatedOfferRef.current = false;
    setRtcFlowError("");
  }, []);

  const handleLeaveRoom = useCallback(() => {
    resetRtcFlowState();
    closePeerConnection();
    stopLocalMedia();
    leaveRoom();
    navigate("/dashboard");
  }, [closePeerConnection, leaveRoom, navigate, resetRtcFlowState, stopLocalMedia]);

  const handleSelectRtcTarget = useCallback(
    (targetUserId: number) => {
      if (!availableRtcTargetUserIds.includes(targetUserId)) {
        return;
      }

      setRtcTargetUserId(targetUserId);
    },
    [availableRtcTargetUserIds]
  );

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
    if (!canSendWebRtc || !isSocketOpen || localUserId === null || isFinalState) {
      setRtcTargetUserId(null);
      return;
    }

    if (rtcTargetUserId !== null) {
      if (availableRtcTargetUserIds.includes(rtcTargetUserId)) {
        return;
      }

      setRtcTargetUserId(null);
      return;
    }

    if (availableRtcTargetUserIds.length === 1) {
      setRtcTargetUserId(availableRtcTargetUserIds[0]);
    }
  }, [
    availableRtcTargetUserIds,
    canSendWebRtc,
    isFinalState,
    isSocketOpen,
    localUserId,
    rtcTargetUserId,
  ]);

  useEffect(() => {
    if (isFinalState && activePanel !== null) {
      setActivePanel(null);
    }
  }, [activePanel, isFinalState]);

  useEffect(() => {
    return () => {
      resetRtcFlowState();
      closePeerConnection();
      stopLocalMedia();
    };
  }, [closePeerConnection, resetRtcFlowState, stopLocalMedia]);

  useEffect(() => {
    if (rtcConnectionState !== "failed") {
      return;
    }

    resetRtcFlowState();
    closePeerConnection();
  }, [closePeerConnection, resetRtcFlowState, rtcConnectionState]);

  useEffect(() => {
    const resolvedLocalUserId = localUserId;
    const resolvedTargetUserId = rtcTargetUserId;
    const canParticipateInRtc =
      canSendWebRtc &&
      isSocketOpen &&
      !isFinalState &&
      resolvedLocalUserId !== null &&
      resolvedTargetUserId !== null;

    if (!canParticipateInRtc) {
      resetRtcFlowState();
      closePeerConnection();
      return;
    }

    if (activeRtcPeerUserIdRef.current !== resolvedTargetUserId) {
      resetRtcFlowState();
      activeRtcPeerUserIdRef.current = resolvedTargetUserId;
      closePeerConnection();
    }

    const currentPeerConnection = createPeerConnection(
      localStream,
      buildIceCandidateHandler(resolvedTargetUserId)
    );
    if (!currentPeerConnection) {
      setRtcFlowError("Unable to initialize WebRTC connection.");
      return;
    }

    if (resolvedLocalUserId >= resolvedTargetUserId || hasInitiatedOfferRef.current) {
      return;
    }

    hasInitiatedOfferRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        if (currentPeerConnection.signalingState !== "stable") {
          hasInitiatedOfferRef.current = false;
          return;
        }

        const offer = await currentPeerConnection.createOffer();
        await currentPeerConnection.setLocalDescription(offer);
        const localSdp = currentPeerConnection.localDescription?.sdp?.trim() ?? "";
        if (!localSdp) {
          throw new Error("Failed to create local WebRTC offer.");
        }

        if (cancelled) {
          return;
        }

        const didSendOffer = sendWebRtcOffer(resolvedTargetUserId, localSdp);
        if (!didSendOffer) {
          hasInitiatedOfferRef.current = false;
          setRtcFlowError("Unable to send WebRTC offer to the remote participant.");
          return;
        }

        setRtcFlowError("");
      } catch (error) {
        hasInitiatedOfferRef.current = false;
        if (!cancelled) {
          setRtcFlowError(toErrorMessage(error, "Failed to create or send a WebRTC offer."));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    buildIceCandidateHandler,
    canSendWebRtc,
    closePeerConnection,
    createPeerConnection,
    isFinalState,
    isSocketOpen,
    localStream,
    localUserId,
    resetRtcFlowState,
    rtcTargetUserId,
    sendWebRtcOffer,
  ]);

  useEffect(() => {
    if (!lastWebRtcSignal || !canSendWebRtc || !isSocketOpen || isFinalState) {
      return;
    }

    const resolvedLocalUserId = localUserId;
    const resolvedTargetUserId = activeRtcPeerUserIdRef.current;
    if (resolvedLocalUserId === null || resolvedTargetUserId === null) {
      return;
    }

    if (lastWebRtcSignal.toUserId !== null && lastWebRtcSignal.toUserId !== resolvedLocalUserId) {
      return;
    }

    if (lastWebRtcSignal.fromUserId !== resolvedTargetUserId) {
      return;
    }

    const currentPeerConnection = createPeerConnection(
      localStream,
      buildIceCandidateHandler(resolvedTargetUserId)
    );
    if (!currentPeerConnection) {
      setRtcFlowError("Unable to process WebRTC signaling because peer setup failed.");
      return;
    }

    const flushPendingIceCandidates = async () => {
      if (!currentPeerConnection.remoteDescription) {
        return;
      }

      const pendingCandidates = [...pendingRemoteIceCandidatesRef.current];
      pendingRemoteIceCandidatesRef.current = [];

      for (const candidate of pendingCandidates) {
        await currentPeerConnection.addIceCandidate(candidate);
      }
    };

    void (async () => {
      try {
        switch (lastWebRtcSignal.type) {
          case "webrtc.offer": {
            if (resolvedLocalUserId < lastWebRtcSignal.fromUserId) {
              return;
            }

            const remoteSdp = lastWebRtcSignal.sdp?.trim() ?? "";
            if (!remoteSdp || currentPeerConnection.signalingState !== "stable") {
              return;
            }

            await currentPeerConnection.setRemoteDescription({
              type: "offer",
              sdp: remoteSdp,
            });
            await flushPendingIceCandidates();

            const answer = await currentPeerConnection.createAnswer();
            await currentPeerConnection.setLocalDescription(answer);
            const localSdp = currentPeerConnection.localDescription?.sdp?.trim() ?? "";
            if (!localSdp) {
              throw new Error("Failed to create local WebRTC answer.");
            }

            const didSendAnswer = sendWebRtcAnswer(lastWebRtcSignal.fromUserId, localSdp);
            if (!didSendAnswer) {
              setRtcFlowError("Unable to send WebRTC answer to the remote participant.");
              return;
            }

            setRtcFlowError("");
            break;
          }
          case "webrtc.answer": {
            const remoteSdp = lastWebRtcSignal.sdp?.trim() ?? "";
            if (!remoteSdp || currentPeerConnection.signalingState === "closed") {
              return;
            }

            await currentPeerConnection.setRemoteDescription({
              type: "answer",
              sdp: remoteSdp,
            });
            await flushPendingIceCandidates();
            setRtcFlowError("");
            break;
          }
          case "webrtc.ice_candidate": {
            const candidate = lastWebRtcSignal.candidate;
            if (!candidate) {
              return;
            }

            if (!currentPeerConnection.remoteDescription) {
              pendingRemoteIceCandidatesRef.current.push(candidate);
              return;
            }

            await currentPeerConnection.addIceCandidate(candidate);
            setRtcFlowError("");
            break;
          }
          default:
            break;
        }
      } catch (error) {
        setRtcFlowError(toErrorMessage(error, "Failed to apply incoming WebRTC signaling data."));
      }
    })();
  }, [
    buildIceCandidateHandler,
    canSendWebRtc,
    createPeerConnection,
    isFinalState,
    isSocketOpen,
    lastWebRtcSignal,
    localStream,
    localUserId,
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
          remoteStream={remoteStream}
          hasLocalVideoTrack={hasLocalVideoTrack}
          hasLocalAudioTrack={hasLocalAudioTrack}
          hasRemoteVideoTrack={hasRemoteVideoTrack}
          rtcTargetUserId={rtcTargetUserId}
          localMediaUiState={localMediaUiState}
          rtcUiState={rtcUiState}
          remoteUiState={remoteUiState}
          onSelectRtcTarget={handleSelectRtcTarget}
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
                RTC target: {rtcTargetUserId ?? "None"}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                Peer state: {formatStatusLabel(rtcConnectionState)}
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
        description="Connected room members and peer selection"
        onClose={() => setActivePanel(null)}
      >
        <ParticipantsPanel
          activeUsers={activeUsers}
          localUserId={localUserId}
          rtcTargetUserId={rtcTargetUserId}
          onSelectRtcTarget={handleSelectRtcTarget}
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
          hostActionPendingKey={hostActionPendingKey}
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
              const kickKey = userId ? `member.kick:${userId}` : "";

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
                      disabled={hostActionPendingKey === kickKey}
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
    </div>
  );
}

export default RoomPage;
