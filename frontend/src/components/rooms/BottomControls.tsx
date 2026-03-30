type BottomControlsProps = {
  activeCount: number;
  waitingCount: number;
  isHost: boolean;
  onOpenActive: () => void;
  onOpenWaiting: () => void;
  onOpenChat: () => void;
  onLeave: () => void;
};

type ControlButtonProps = {
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  badge?: number;
  title?: string;
};

const ControlButton = ({
  label,
  onClick,
  tone = "default",
  disabled = false,
  badge,
  title,
}: ControlButtonProps) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`relative inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition ${
      tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    } disabled:cursor-not-allowed disabled:opacity-60`}
  >
    {label}
    {typeof badge === "number" ? (
      <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
        {badge}
      </span>
    ) : null}
  </button>
);

const BottomControls = ({
  activeCount,
  waitingCount,
  isHost,
  onOpenActive,
  onOpenWaiting,
  onOpenChat,
  onLeave,
}: BottomControlsProps) => {
  return (
    <footer className="sticky bottom-4 z-30 mt-4 flex justify-center px-2">
      <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.7)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <ControlButton
          label="Mute"
          disabled
          title="Mute/unmute signaling is not available in V1"
        />
        <ControlButton
          label="Camera"
          disabled
          title="Camera toggle signaling is not available in V1"
        />
        <ControlButton
          label="Share"
          disabled
          title="Screen sharing is not available in V1"
        />
        <ControlButton label="Active" badge={activeCount} onClick={onOpenActive} />
        {isHost ? <ControlButton label="Waiting" badge={waitingCount} onClick={onOpenWaiting} /> : null}
        <ControlButton label="Chat" onClick={onOpenChat} />
        <ControlButton label="Leave" tone="danger" onClick={onLeave} />
      </div>
    </footer>
  );
};

export default BottomControls;
