import { useEffect, useMemo, useRef } from "react";

type ParticipantTileProps = {
  name: string;
  label: string;
  status: string;
  stream: MediaStream | null;
  showVideo: boolean;
  playAudioWhenAudioOnly?: boolean;
  muted?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  accent?: boolean;
  className?: string;
};

const initialsForName = (value: string): string => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "?";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const avatarPalette = [
  "#1b3158",
  "#244a38",
  "#3a2450",
  "#553a1d",
  "#4a1e25",
  "#1c3a3f",
  "#3a1d4a",
];

const paletteColorFor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % avatarPalette.length;
  return avatarPalette[index];
};

const ParticipantTile = ({
  name,
  label,
  status,
  stream,
  showVideo,
  playAudioWhenAudioOnly = false,
  muted = false,
  selectable = false,
  selected = false,
  onSelect,
  accent = false,
  className,
}: ParticipantTileProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initials = useMemo(() => initialsForName(name), [name]);
  const avatarColor = useMemo(() => paletteColorFor(name || label || "?"), [name, label]);
  const shouldRenderAudioElement = playAudioWhenAudioOnly && !showVideo;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    videoElement.srcObject = showVideo ? stream : null;

    return () => {
      videoElement.srcObject = null;
    };
  }, [showVideo, stream]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    audioElement.srcObject = shouldRenderAudioElement ? stream : null;

    return () => {
      audioElement.srcObject = null;
    };
  }, [shouldRenderAudioElement, stream]);

  const ring = selected
    ? "0 0 0 2px var(--sm-accent), 0 0 0 4px var(--sm-accent-ring)"
    : accent
    ? "0 0 0 2px rgba(77,156,255,0.55)"
    : "inset 0 0 0 1px rgba(255,255,255,0.06)";

  const tileStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    background: `linear-gradient(135deg, ${avatarColor}, #0A0A0C)`,
    boxShadow: ring,
    cursor: selectable ? "pointer" : "default",
    aspectRatio: "16 / 10",
    transition: "box-shadow 220ms var(--sm-ease-standard)",
  };

  const content = (
    <>
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              color: "#F5F5F7",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              fontFamily: "var(--sm-font-display)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            {initials}
          </div>
        </div>
      )}
      {shouldRenderAudioElement ? <audio ref={audioRef} autoPlay /> : null}

      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "5px 10px",
          borderRadius: 999,
          background: "rgba(10,10,12,0.62)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: "#F5F5F7",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "-0.005em",
          maxWidth: "calc(100% - 24px)",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        {label ? (
          <span style={{ color: "rgba(245,245,247,0.6)", fontSize: 11 }}>· {label}</span>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "4px 9px",
          borderRadius: 999,
          background: "rgba(10,10,12,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          fontSize: 10.5,
          fontWeight: 500,
          color: "rgba(245,245,247,0.85)",
          letterSpacing: "-0.005em",
        }}
      >
        {status}
      </div>
    </>
  );

  if (selectable && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={className}
        style={{ ...tileStyle, border: 0, padding: 0 }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} style={tileStyle}>
      {content}
    </div>
  );
};

export default ParticipantTile;
