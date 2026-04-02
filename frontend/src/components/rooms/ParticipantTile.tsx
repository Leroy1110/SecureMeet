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
  className = "",
}: ParticipantTileProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initials = useMemo(() => initialsForName(name), [name]);

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

    audioElement.srcObject = playAudioWhenAudioOnly ? stream : null;

    return () => {
      audioElement.srcObject = null;
    };
  }, [playAudioWhenAudioOnly, stream]);

  const tileClassName = `relative overflow-hidden rounded-2xl border bg-slate-900 ${
    selected ? "border-blue-400 ring-2 ring-blue-300/50 dark:border-blue-500 dark:ring-blue-900/60" : "border-slate-700"
  } ${selectable ? "cursor-pointer transition hover:border-slate-500" : ""} ${className}`;

  const content = (
    <>
      <div className="aspect-video w-full">
        {showVideo ? (
          <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.35),_rgba(15,23,42,0.85))]">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-500/60 bg-slate-800/70 text-lg font-semibold text-slate-100">
              {initials}
            </span>
          </div>
        )}
      </div>
      {playAudioWhenAudioOnly ? <audio ref={audioRef} autoPlay /> : null}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3">
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-slate-200">{label}</p>
        </div>
        <span className="rounded-full border border-white/30 bg-black/40 px-2 py-1 text-[11px] font-medium text-slate-100">
          {status}
        </span>
      </div>
    </>
  );

  if (selectable && onSelect) {
    return (
      <button type="button" onClick={onSelect} className={tileClassName}>
        {content}
      </button>
    );
  }

  return <div className={tileClassName}>{content}</div>;
};

export default ParticipantTile;
