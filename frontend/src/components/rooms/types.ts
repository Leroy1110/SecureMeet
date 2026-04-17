export type LocalMediaUiState =
  | "disabled_by_preferences"
  | "requesting_permissions"
  | "ready_audio_video"
  | "ready_audio_only"
  | "ready_video_only"
  | "failed"
  | "not_started";

export type MeshUiState =
  | "idle"
  | "waiting_for_peers"
  | "preparing_local_media"
  | "connecting"
  | "connected"
  | "partially_connected"
  | "failed";

export type PeerTileState =
  | "connecting"
  | "connected"
  | "audio_only"
  | "video_active"
  | "disconnected"
  | "failed";
