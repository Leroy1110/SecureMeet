import { type RoomPresenceUser } from "../../hooks/useRoomSocket";
import ParticipantTile from "./ParticipantTile";
import type { LocalMediaUiState, RemoteUiState, RtcUiState } from "./types";

type MeetingStageProps = {
  activeUsers: RoomPresenceUser[];
  localUserId: number | null;
  localDisplayName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  hasLocalVideoTrack: boolean;
  hasLocalAudioTrack: boolean;
  hasRemoteVideoTrack: boolean;
  rtcTargetUserId: number | null;
  localMediaUiState: LocalMediaUiState;
  rtcUiState: RtcUiState;
  remoteUiState: RemoteUiState;
  onSelectRtcTarget: (userId: number) => void;
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

const remoteDescriptionByState: Record<RemoteUiState, string> = {
  no_peer_selected: "Select participant",
  waiting_for_remote: "Waiting for remote media",
  connecting: "Connecting",
  audio_only: "Remote audio only",
  video_active: "Remote video live",
  remote_disconnected: "Remote disconnected",
  failed: "RTC failed",
};

const rtcDescriptionByState: Record<RtcUiState, string> = {
  idle: "Idle",
  waiting_for_peer: "Waiting for participant",
  preparing_local_media: "Preparing local media",
  ready_to_connect: "Ready",
  connecting: "Connecting",
  connected: "Connected",
  failed: "Failed",
};

const MeetingStage = ({
  activeUsers,
  localUserId,
  localDisplayName,
  localStream,
  remoteStream,
  hasLocalVideoTrack,
  hasLocalAudioTrack,
  hasRemoteVideoTrack,
  rtcTargetUserId,
  localMediaUiState,
  rtcUiState,
  remoteUiState,
  onSelectRtcTarget,
}: MeetingStageProps) => {
  const remoteParticipants = activeUsers.filter(
    (user) => user.userId !== null && user.userId > 0 && user.userId !== localUserId
  );
  const selectedRemoteParticipant = remoteParticipants.find((user) => user.userId === rtcTargetUserId) ?? null;
  const nonSelectedRemoteParticipants = remoteParticipants.filter((user) => user.userId !== rtcTargetUserId);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Local: {localMediaDescriptionByState[localMediaUiState]}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          RTC: {rtcDescriptionByState[rtcUiState]}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Remote: {remoteDescriptionByState[remoteUiState]}
        </span>
      </div>

      {remoteParticipants.length > 1 ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Select active peer
          </p>
          <div className="flex flex-wrap gap-2">
            {remoteParticipants.map((user) => {
              const userId = user.userId;
              if (userId === null) {
                return null;
              }

              const selected = userId === rtcTargetUserId;
              return (
                <button
                  key={userId}
                  type="button"
                  onClick={() => onSelectRtcTarget(userId)}
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selected
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {getPresenceUserLabel(user)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ParticipantTile
          name={localDisplayName}
          label="You"
          status={localMediaDescriptionByState[localMediaUiState]}
          stream={localStream}
          showVideo={hasLocalVideoTrack}
          muted
        />

        {selectedRemoteParticipant ? (
          <ParticipantTile
            key={`selected:${selectedRemoteParticipant.userId ?? selectedRemoteParticipant.label}`}
            name={getPresenceUserLabel(selectedRemoteParticipant)}
            label="Selected participant"
            status={remoteDescriptionByState[remoteUiState]}
            stream={remoteStream}
            showVideo={hasRemoteVideoTrack}
            playAudioWhenAudioOnly
            selected
            selectable
            onSelect={() => {
              const userId = selectedRemoteParticipant.userId;
              if (userId !== null) {
                onSelectRtcTarget(userId);
              }
            }}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 px-4 text-center text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {remoteParticipants.length > 0
              ? "Select a participant tile to start the single-peer WebRTC connection."
              : "No remote participants are active yet."}
          </div>
        )}

        {nonSelectedRemoteParticipants.map((user) => {
          const userId = user.userId;
          if (userId === null) {
            return null;
          }

          return (
            <ParticipantTile
              key={`presence:${userId}`}
              name={getPresenceUserLabel(user)}
              label="Connected participant"
              status="Presence only"
              stream={null}
              showVideo={false}
              selectable
              selected={userId === rtcTargetUserId}
              onSelect={() => onSelectRtcTarget(userId)}
            />
          );
        })}

        {!hasLocalVideoTrack && !hasLocalAudioTrack ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 md:col-span-2">
            Local preview is not publishing media right now. You can still stay connected to room presence and chat.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MeetingStage;
