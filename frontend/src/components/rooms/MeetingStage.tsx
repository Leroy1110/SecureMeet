import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import type { PeerConnectionSnapshot } from "../../hooks/useWebRtcPeers";
import {
  MESH_SOFT_PARTICIPANT_LIMIT,
  type MediaTopology,
} from "../../lib/mediaTopology";
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
  disabled_by_preferences: "Media disabled",
  requesting_permissions: "Preparing devices",
  ready_audio_video: "Camera + mic ready",
  ready_audio_only: "Audio only",
  ready_video_only: "Video only",
  failed: "Local media failed",
  not_started: "Waiting for room",
};

const meshDescriptionByState: Record<MeshUiState, string> = {
  idle: "Idle",
  waiting_for_peers: "Waiting for participants",
  preparing_local_media: "Preparing local media",
  connecting: "Connecting",
  connected: "All peers connected",
  partially_connected: "Partial connectivity",
  failed: "Failed",
};

const peerTileDescriptionByState: Record<PeerTileState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  audio_only: "Audio only",
  video_active: "Video live",
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

const getGridColumnsClass = (totalTiles: number): string => {
  if (totalTiles <= 1) {
    return "grid-cols-1";
  }
  if (totalTiles <= 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  if (totalTiles <= 4) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
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
  const gridColumnsClass = getGridColumnsClass(totalTiles);

  const isMeshOverloaded =
    mediaTopology === "mesh" &&
    totalTiles > MESH_SOFT_PARTICIPANT_LIMIT;

  const topologyLabel = mediaTopology === "mesh" ? "Mesh" : "SFU";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Local: {localMediaDescriptionByState[localMediaUiState]}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {topologyLabel}: {meshDescriptionByState[meshUiState]}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Participants: {totalTiles}
        </span>
      </div>

      {isMeshOverloaded ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Mesh topology is best for up to {MESH_SOFT_PARTICIPANT_LIMIT} participants. With {totalTiles} participants in the room, video quality and bandwidth may degrade.
        </p>
      ) : null}

      <div className={`grid gap-3 ${gridColumnsClass}`}>
        <ParticipantTile
          name={localDisplayName}
          label="You"
          status={localMediaDescriptionByState[localMediaUiState]}
          stream={localStream}
          showVideo={hasLocalVideoTrack}
          muted
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

        {!hasLocalVideoTrack && !hasLocalAudioTrack && remoteParticipants.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:col-span-2">
            Local preview is not publishing media right now. You can still stay connected to room presence and chat.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MeetingStage;
