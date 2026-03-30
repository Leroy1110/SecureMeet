import { type ReactNode } from "react";

type RoomDrawerProps = {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
};

const RoomDrawer = ({ isOpen, title, description, onClose, children }: RoomDrawerProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-full flex-col border-l border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.65)] dark:border-slate-800 dark:bg-slate-950 sm:w-[430px]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
};

export default RoomDrawer;
