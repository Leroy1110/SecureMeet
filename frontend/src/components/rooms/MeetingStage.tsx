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
  hasLocalVideoTrack: boolean;
  hasLocalAudioTrack: boolean;
  localMediaUiState: LocalMediaUiState;
  peerStates: Map<number, PeerConnectionSnapshot>;
  meshUiState: MeshUiState;
  mediaTopology: MediaTopology;
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

const MeetingStage = ({
  activeUsers,
  localUserId,
  localDisplayName,
  localStream,
  hasLocalVideoTrack,
  hasLocalAudioTrack,
  localMediaUiState,
  peerStates,
  meshUiState,
  mediaTopology,
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
          status={localMediaDescriptionByState[localMediaUiState]}
          stream={localStream}
          showVideo={hasLocalVideoTrack}
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
          const hasRemoteVideo = Boolean(remoteStream?.getVideoTracks().length);
          const hasRemoteAudio = Boolean(remoteStream?.getAudioTracks().length);
          const tileState = derivePeerTileState(snapshot, hasRemoteVideo, hasRemoteAudio);
          const statusLabel = snapshot?.error || peerTileDescriptionByState[tileState];

          return (
            <ParticipantTile
              key={`peer:${userId}`}
              name={getPresenceUserLabel(user)}
              label="Participant"
              status={statusLabel}
              stream={remoteStream}
              showVideo={hasRemoteVideo}
              playAudioWhenAudioOnly
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
