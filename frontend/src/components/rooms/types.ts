export type LocalMediaUiState =
  | "disabled_by_preferences"
  | "requesting_permissions"
  | "ready_audio_video"
  | "ready_audio_only"
  | "ready_video_only"
  | "failed"
  | "not_started";

export type RtcUiState =
  | "idle"
  | "waiting_for_peer"
  | "preparing_local_media"
  | "ready_to_connect"
  | "connecting"
  | "connected"
  | "failed";

export type RemoteUiState =
  | "no_peer_selected"
  | "waiting_for_remote"
  | "connecting"
  | "audio_only"
  | "video_active"
  | "remote_disconnected"
  | "failed";
