export type MediaTopology = "mesh" | "sfu";

// Phase 1 runtime topology. SFU mode is reserved for a future server integration.
export const ROOM_MEDIA_TOPOLOGY: MediaTopology = "mesh";

// Soft cap where mesh quality and bandwidth can degrade on typical clients.
export const MESH_SOFT_PARTICIPANT_LIMIT = 5;

// Baseline documented and validated for Phase 1.
export const PHASE1_MESH_BASELINE_TOTAL_PARTICIPANTS = 5;
