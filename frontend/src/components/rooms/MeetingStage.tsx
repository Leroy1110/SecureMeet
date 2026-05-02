import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import type { PeerConnectionSnapshot } from "../../hooks/useWebRtcPeers";
import {
  MESH_SOFT_PARTICIPANT_LIMIT,
  type MediaTopology,
} from "../../lib/mediaTopology";
import { SmBadge, SmIcon } from "../sm";
import ParticipantTile from "./ParticipantTile";
import type { LocalMediaUiState, MeshUiState, PeerTileState } from "./types";

type MeetingStageProps = {
  activeUsers: RoomPresenceUser[];
  localUserId: number | null;
  localDisplayName: string;
  localStream: MediaStream | null;
  localCameraPreviewStream: MediaStream | null;
  hasLocalVideoTrack: boolean;
  hasLocalAudioTrack: boolean;
  localMediaUiState: LocalMediaUiState;
  peerStates: Map<number, PeerConnectionSnapshot>;
  meshUiState: MeshUiState;
  mediaTopology: MediaTopology;
  screenSharerUserId: number | null;
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

const localMediaDescriptionByState: Record<LocalMediaUiState, string> = {
  disabled_by_preferences: "Media off",
  requesting_permissions: "Preparing…",
  ready_audio_video: "Cam + mic",
  ready_audio_only: "Audio only",
  ready_video_only: "Video only",
  failed: "Media failed",
  not_started: "Waiting",
};

const meshDescriptionByState: Record<MeshUiState, string> = {
  idle: "Idle",
  waiting_for_peers: "Waiting",
  preparing_local_media: "Preparing",
  connecting: "Connecting",
  connected: "Connected",
  partially_connected: "Partial",
  failed: "Failed",
};

const peerTileDescriptionByState: Record<PeerTileState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  audio_only: "Audio only",
  video_active: "Live",
  disconnected: "Disconnected",
  failed: "Failed",
};

const derivePeerTileState = (
  snapshot: PeerConnectionSnapshot | undefined,
  hasVideo: boolean,
  hasAudio: boolean
): PeerTileState => {
  if (!snapshot) {
    return "connecting";
  }

  if (snapshot.connectionState === "failed" || snapshot.error) {
    return "failed";
  }

  if (snapshot.connectionState === "disconnected" || snapshot.connectionState === "closed") {
    return "disconnected";
  }

  if (snapshot.connectionState === "connected") {
    if (hasVideo) {
      return "video_active";
    }
    if (hasAudio) {
      return "audio_only";
    }
    return "connected";
  }

  return "connecting";
};

const getGridTemplate = (totalTiles: number): string => {
  if (totalTiles <= 1) return "repeat(1, 1fr)";
  if (totalTiles <= 4) return "repeat(auto-fit, minmax(280px, 1fr))";
  return "repeat(auto-fit, minmax(220px, 1fr))";
};

const hasLiveLocalVideoTrack = (stream: MediaStream | null): boolean =>
  Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled));

const hasLiveRemoteVideoTrack = (stream: MediaStream | null): boolean =>
  Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live" && !track.muted));

const MeetingStage = ({
  activeUsers,
  localUserId,
  localDisplayName,
  localStream,
  localCameraPreviewStream,
  hasLocalVideoTrack,
  hasLocalAudioTrack,
  localMediaUiState,
  peerStates,
  meshUiState,
  mediaTopology,
  screenSharerUserId,
}: MeetingStageProps) => {
  const remoteParticipants = activeUsers.filter(
    (user) => user.userId !== null && user.userId > 0 && user.userId !== localUserId
  );

  const totalTiles = remoteParticipants.length + 1;
  const gridTemplate = getGridTemplate(totalTiles);

  const isMeshOverloaded =
    mediaTopology === "mesh" && totalTiles > MESH_SOFT_PARTICIPANT_LIMIT;

  const topologyLabel = mediaTopology === "mesh" ? "Mesh" : "SFU";

  const meshTone =
    meshUiState === "connected"
      ? "inverse-success"
      : meshUiState === "failed"
      ? "inverse-danger"
      : "inverse-neutral";
  const isLocalSharing = localUserId !== null && screenSharerUserId === localUserId;
  const remoteSharer = remoteParticipants.find((user) => user.userId === screenSharerUserId) ?? null;
  const sharedStream = isLocalSharing
    ? localStream
    : remoteSharer && remoteSharer.userId !== null
    ? peerStates.get(remoteSharer.userId)?.remoteStream ?? null
    : null;
  const localTileStream = isLocalSharing ? localCameraPreviewStream : localStream;
  const showLocalTileVideo = isLocalSharing
    ? hasLiveLocalVideoTrack(localCameraPreviewStream)
    : hasLocalVideoTrack;
  const showSharedStage = screenSharerUserId !== null;
  const sharedStageName = isLocalSharing
    ? `${localDisplayName} (You)`
    : remoteSharer
    ? getPresenceUserLabel(remoteSharer)
    : "Participant";
  const hasSharedVideo = isLocalSharing
    ? hasLiveLocalVideoTrack(sharedStream)
    : hasLiveRemoteVideoTrack(sharedStream);

  return (
    <section
      style={{
        background: "var(--sm-stage)",
        borderRadius: 28,
        padding: 20,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), var(--sm-shadow-xl)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(60% 70% at 50% 0%, rgba(77,156,255,0.10), transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <SmBadge tone="inverse-neutral">
          {localMediaDescriptionByState[localMediaUiState]}
        </SmBadge>
        <SmBadge tone={meshTone} dot>
          {topologyLabel} · {meshDescriptionByState[meshUiState]}
        </SmBadge>
        <SmBadge tone="inverse-neutral">
          {totalTiles} participant{totalTiles === 1 ? "" : "s"}
        </SmBadge>
      </div>

      {isMeshOverloaded ? (
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(180,112,10,0.18)",
            color: "#F6C685",
            fontSize: 12.5,
            marginBottom: 16,
          }}
        >
          <SmIcon name="shield" size={14} />
          Mesh is optimized for up to {MESH_SOFT_PARTICIPANT_LIMIT} participants. With {totalTiles}, quality may degrade.
        </div>
      ) : null}

      {showSharedStage ? (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <ParticipantTile
            name={sharedStageName}
            label="Shared screen"
            status={hasSharedVideo ? "Live share" : "Preparing share"}
            stream={sharedStream}
            showVideo={hasSharedVideo}
            muted={isLocalSharing}
            accent
          />
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: gridTemplate,
          gap: 12,
        }}
      >
        <ParticipantTile
          name={localDisplayName}
          label="You"
          status={isLocalSharing ? "Sharing screen" : localMediaDescriptionByState[localMediaUiState]}
          stream={localTileStream}
          showVideo={showLocalTileVideo}
          muted
          accent
        />

        {remoteParticipants.map((user) => {
          const userId = user.userId;
          if (userId === null) {
            return null;
          }

          const snapshot = peerStates.get(userId);
          const remoteStream = snapshot?.remoteStream ?? null;
          const hasRemoteVideo = hasLiveRemoteVideoTrack(remoteStream);
          const hasRemoteAudio = Boolean(remoteStream?.getAudioTracks().length);
          const tileState = derivePeerTileState(snapshot, hasRemoteVideo, hasRemoteAudio);
          const isSharing = screenSharerUserId === userId;
          const statusLabel = isSharing
            ? "Sharing screen"
            : snapshot?.error || peerTileDescriptionByState[tileState];

          return (
            <ParticipantTile
              key={`peer:${userId}`}
              name={getPresenceUserLabel(user)}
              label="Participant"
              status={statusLabel}
              stream={remoteStream}
              showVideo={!isSharing && hasRemoteVideo}
              playAudioWhenAudioOnly
              accent={isSharing}
            />
          );
        })}
      </div>

      {!hasLocalVideoTrack && !hasLocalAudioTrack && remoteParticipants.length === 0 ? (
        <p
          style={{
            position: "relative",
            marginTop: 14,
            fontSize: 12.5,
            color: "var(--sm-stage-muted)",
            textAlign: "center",
          }}
        >
          Local preview isn't publishing media. You're still connected to room presence and chat.
        </p>
      ) : null}
    </section>
  );
};

export default MeetingStage;
