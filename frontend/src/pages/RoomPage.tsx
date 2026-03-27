import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocalMedia } from "../hooks/useLocalMedia";
import { type RoomPresenceUser, type SessionStatus, useRoomSocket } from "../hooks/useRoomSocket";
import { useWebRtcPeer } from "../hooks/useWebRtcPeer";
import { getRoomEntryPreferences } from "../lib/roomEntryPreferences";

type StatusTone = "neutral" | "success" | "warning" | "danger";

const getSessionStateContent = (
  status: SessionStatus,
  fallbackError: string
): { title: string; description: string; tone: StatusTone } => {
  switch (status) {
    case "waiting":
      return {
        title: "Waiting for host approval",
        description: "A host must approve your access before you can join this meeting.",
        tone: "neutral",
      };
    case "active":
      return {
        title: "You are in the room",
        description: "Your session is active and connected to this SecureMeet room.",
        tone: "success",
      };
    case "rejected":
      return {
        title: "Access rejected",
        description: "Your join request was declined by the host.",
        tone: "danger",
      };
    case "kicked":
      return {
        title: "Removed from room",
        description: "Your session was removed by the host.",
        tone: "danger",
      };
    case "disconnected":
      return {
        title: "Session disconnected",
        description: "This session ended or was replaced by another connection.",
        tone: "warning",
      };
    case "error":
      return {
        title: "Connection error",
        description: fallbackError || "Something went wrong while maintaining your room session.",
        tone: "danger",
      };
    case "unknown":
    default:
      return {
        title: "Connecting to room",
        description: "We are establishing your SecureMeet room session.",
        tone: "neutral",
      };
  }
};

const formatStatusLabel = (value: string): string =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getToneClasses = (tone: StatusTone): { card: string; badge: string } => {
  if (tone === "success") {
    return {
      card: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }

  if (tone === "warning") {
    return {
      card: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30",
      badge: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300",
    };
  }

  if (tone === "danger") {
    return {
      card: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30",
      badge: "border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300",
    };
  }

  return {
    card: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
};

const getPresenceUserLabel = (user: RoomPresenceUser): string => {
  if (user.label.trim()) {
    return user.label;
  }

  if (user.userId !== null) {
    return `User ${user.userId}`;
  }

  return "Unknown user";
};

const toErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
};

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
  const audioEnabled = roomEntryPreferences?.audioEnabled ?? true;
  const videoEnabled = roomEntryPreferences?.videoEnabled ?? true;
  const shouldStartLocalMedia = role === "host" || sessionStatus === "active";
  const preferencesMediaDisabled = !audioEnabled && !videoEnabled;
  const localPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const remotePreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const remotePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeRtcPeerUserIdRef = useRef<number | null>(null);
  const pendingRemoteIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasInitiatedOfferRef = useRef(false);
  const [rtcFlowError, setRtcFlowError] = useState("");
  const [rtcTargetUserId, setRtcTargetUserId] = useState<number | null>(null);
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

  const buildIceCandidateHandler = (targetUserId: number | null) => {
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
  };

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

  const handleLeaveRoom = () => {
    closePeerConnection();
    stopLocalMedia();
    leaveRoom();
    navigate("/dashboard");
  };

  const stateContent = getSessionStateContent(sessionStatus, displayedError);
  const toneClasses = getToneClasses(stateContent.tone);

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
    const videoElement = localPreviewVideoRef.current;
    if (!videoElement) {
      return;
    }

    videoElement.srcObject = hasLocalVideoTrack ? localStream : null;

    return () => {
      videoElement.srcObject = null;
    };
  }, [hasLocalVideoTrack, localStream]);

  useEffect(() => {
    const videoElement = remotePreviewVideoRef.current;
    if (!videoElement) {
      return;
    }

    videoElement.srcObject = hasRemoteVideoTrack ? remoteStream : null;

    return () => {
      videoElement.srcObject = null;
    };
  }, [hasRemoteVideoTrack, remoteStream]);

  useEffect(() => {
    const audioElement = remotePreviewAudioRef.current;
    if (!audioElement) {
      return;
    }

    audioElement.srcObject = hasRemoteAudioTrack && !hasRemoteVideoTrack ? remoteStream : null;

    return () => {
      audioElement.srcObject = null;
    };
  }, [hasRemoteAudioTrack, hasRemoteVideoTrack, remoteStream]);

  useEffect(() => {
    if (!canSendWebRtc || !isSocketOpen || localUserId === null) {
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

    const nextTargetUserId = availableRtcTargetUserIds[0] ?? null;
    if (nextTargetUserId !== null) {
      setRtcTargetUserId(nextTargetUserId);
    }
  }, [availableRtcTargetUserIds, canSendWebRtc, isSocketOpen, localUserId, rtcTargetUserId]);

  useEffect(() => {
    return () => {
      closePeerConnection();
    };
  }, [closePeerConnection]);

  useEffect(() => {
    if (rtcConnectionState !== "failed") {
      return;
    }

    pendingRemoteIceCandidatesRef.current = [];
    hasInitiatedOfferRef.current = false;
    setRtcFlowError("");
    closePeerConnection();
  }, [closePeerConnection, rtcConnectionState]);

  useEffect(() => {
    const resolvedLocalUserId = localUserId;
    const resolvedTargetUserId = rtcTargetUserId;
    const canParticipateInRtc =
      canSendWebRtc && isSocketOpen && resolvedLocalUserId !== null && resolvedTargetUserId !== null;

    if (!canParticipateInRtc) {
      activeRtcPeerUserIdRef.current = null;
      pendingRemoteIceCandidatesRef.current = [];
      hasInitiatedOfferRef.current = false;
      setRtcFlowError("");
      closePeerConnection();
      return;
    }

    if (activeRtcPeerUserIdRef.current !== resolvedTargetUserId) {
      activeRtcPeerUserIdRef.current = resolvedTargetUserId;
      pendingRemoteIceCandidatesRef.current = [];
      hasInitiatedOfferRef.current = false;
      setRtcFlowError("");
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
    canSendWebRtc,
    closePeerConnection,
    createPeerConnection,
    isSocketOpen,
    localStream,
    localUserId,
    rtcTargetUserId,
    sendWebRtcOffer,
  ]);

  useEffect(() => {
    if (!lastWebRtcSignal || !canSendWebRtc || !isSocketOpen) {
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
      setRtcFlowError("Unable to process WebRTC signaling because peer connection initialization failed.");
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
    canSendWebRtc,
    createPeerConnection,
    isSocketOpen,
    lastWebRtcSignal,
    localStream,
    localUserId,
    sendWebRtcAnswer,
    sendWebRtcIceCandidate,
  ]);

  if (!hasPrerequisites) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Meeting Room</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                SecureMeet room access and real-time session status.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Leave room
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room code</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{normalizedRoomCode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Display name</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {roomEntryPreferences?.displayName || "Not set"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Connection</p>
              <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {formatStatusLabel(transportStatus)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Microphone</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {audioEnabled ? "On" : "Off"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Camera</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {videoEnabled ? "On" : "Off"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
              <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {role ? formatStatusLabel(role) : "Unknown"}
              </span>
            </div>
          </div>
        </section>

        <section className={`rounded-xl border p-6 shadow-sm ${toneClasses.card}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Session status</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{stateContent.title}</h2>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{stateContent.description}</p>
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses.badge}`}>
              {formatStatusLabel(sessionStatus)}
            </span>
          </div>

          {displayedError && sessionStatus !== "error" ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {displayedError}
            </p>
          ) : null}

          {isFinalState ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                Return to dashboard
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Your media preview</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Local camera and microphone readiness based on your room entry preferences.
              </p>
            </div>

            {displayedRtcError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {displayedRtcError}
              </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Local preview
                </p>
                {hasLocalVideoTrack ? (
                  <div className="space-y-2">
                    <video
                      ref={localPreviewVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="aspect-video w-full rounded-lg bg-black object-cover"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {mediaReady ? "Local video and audio are ready." : "Preparing local preview."}
                    </p>
                  </div>
                ) : hasLocalAudioTrack ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">Microphone is ready. Camera is off.</p>
                ) : mediaDisabled || preferencesMediaDisabled ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">Media is disabled in your join preferences.</p>
                ) : mediaLoading ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">Starting your camera and microphone preview...</p>
                ) : mediaError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                    {mediaError}
                  </p>
                ) : shouldStartLocalMedia ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">Preparing local media preview...</p>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Local media preview will start once your room session is active.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Remote preview
                </p>
                {hasRemoteVideoTrack ? (
                  <video
                    ref={remotePreviewVideoRef}
                    autoPlay
                    playsInline
                    className="aspect-video w-full rounded-lg bg-black object-cover"
                  />
                ) : hasRemoteAudioTrack ? (
                  <div className="space-y-2">
                    <audio ref={remotePreviewAudioRef} autoPlay />
                    <p className="text-sm text-slate-700 dark:text-slate-200">Remote microphone is connected. Camera is off.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-200">Waiting for remote media.</p>
                )}

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Peer connection state: {formatStatusLabel(rtcConnectionState)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {isHost ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Waiting for approval</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Review join requests and approve or reject users.
                </p>
              </div>

              {hostActionError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  {hostActionError}
                </p>
              ) : null}

              {waitingUsers.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No users are waiting right now.</p>
              ) : (
                <ul className="space-y-2">
                  {waitingUsers.map((user) => {
                    const userLabel = getPresenceUserLabel(user);
                    const userKey = user.userId !== null ? String(user.userId) : user.label;
                    const approveKey = user.userId ? `waiting.approve:${user.userId}` : "";
                    const rejectKey = user.userId ? `waiting.reject:${user.userId}` : "";
                    const canModerate = user.userId !== null;

                    return (
                      <li
                        key={userKey}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => sendHostWaitingAction("waiting.approve", user.userId)}
                            disabled={!canModerate || hostActionPendingKey === approveKey}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => sendHostWaitingAction("waiting.reject", user.userId)}
                            disabled={!canModerate || hostActionPendingKey === rejectKey}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Active users</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Active participants currently connected to this room.
                </p>

                {activeUsers.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No active users yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {activeUsers.map((user) => {
                      const userId = user.userId;
                      const userLabel = getPresenceUserLabel(user);
                      const kickKey = userId ? `member.kick:${userId}` : "";
                      const isLocalHost = localUserId !== null && userId === localUserId;
                      const canKick = Boolean(userId) && !isLocalHost;

                      return (
                        <li
                          key={userId !== null ? String(userId) : userLabel}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800"
                        >
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userLabel}</p>
                          {canKick ? (
                            <button
                              type="button"
                              onClick={() => sendHostKickAction(userId)}
                              disabled={hostActionPendingKey === kickKey}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                            >
                              Kick
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Chat</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Room chat for active participants and host. Choose Public or send privately to a user.
              </p>
            </div>

            {chatError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {chatError}
              </p>
            ) : null}

            {!canSendChat ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                Chat sending is available only after you become active in the room.
              </p>
            ) : null}

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">No messages yet.</p>
              ) : (
                <ul className="space-y-2">
                  {chatMessages.map((message, index) => (
                    <li
                      key={`${message.from_user_id ?? "unknown"}:${message.created_at}:${index}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {message.from_display_name || (message.from_user_id ? `User ${message.from_user_id}` : "Unknown")}
                        {message.to_user_id
                          ? ` • Private to ${message.to_display_name || `User ${message.to_user_id}`}`
                          : " • Public"}
                        {message.created_at ? ` • ${message.created_at}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-slate-800 dark:text-slate-100">
                        {message.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={sendChatMessage} className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedRecipientUserId === null ? "public" : String(selectedRecipientUserId)}
                onChange={(event) => setSelectedRecipientFromValue(event.target.value)}
                disabled={!canSendChat || !isSocketOpen}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
              >
                <option value="public">Public</option>
                {chatRecipientOptions.map((option) => (
                  <option key={option.userId} value={option.userId}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                disabled={!canSendChat || !isSocketOpen}
                placeholder={canSendChat ? "Type a message" : "You can chat once your session is active"}
                className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
              />
              <button
                type="submit"
                disabled={!canSendChat || !isSocketOpen}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900 dark:hover:bg-blue-800"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Debug details</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {isHost ? `Waiting users (${waitingUsers.length})` : "Waiting users (Host-only visibility)"}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {isHost
                    ? waitingUsers.map((user) => getPresenceUserLabel(user)).join(", ") || "None"
                    : "Unavailable for participants"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active users ({activeUsers.length})
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {activeUsers.map((user) => getPresenceUserLabel(user)).join(", ") || "None"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Last message type</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{lastMessageType || "None"}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Room state</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{roomState || "Unknown"}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RoomPage;
