import { useState } from "react";
import { type RoomPresenceUser } from "../../hooks/useRoomSocket";

const getPresenceUserLabel = (user: RoomPresenceUser): string => {
  if (user.label.trim()) {
    return user.label;
  }

  if (user.userId !== null) {
    return `User ${user.userId}`;
  }

  return "Unknown user";
};

type HostLeaveDialogProps = {
  isOpen: boolean;
  activeUsers: RoomPresenceUser[];
  localUserId: number | null;
  onTransferAndLeave: (toUserId: number) => void;
  onEndMeeting: () => void;
  onCancel: () => void;
};

const HostLeaveDialog = ({
  isOpen,
  activeUsers,
  localUserId,
  onTransferAndLeave,
  onEndMeeting,
  onCancel,
}: HostLeaveDialogProps) => {
  const [step, setStep] = useState<"select" | "confirm_end">("select");

  if (!isOpen) {
    return null;
  }

  const otherParticipants = activeUsers.filter(
    (user) => user.userId !== null && user.userId !== localUserId
  );
  const hasOtherParticipants = otherParticipants.length > 0;

  const handleOpenConfirmEnd = () => {
    setStep("confirm_end");
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleCancel = () => {
    setStep("select");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        {step === "select" ? (
          <>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Leave meeting
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              You are the host. Choose how to leave.
            </p>

            {hasOtherParticipants ? (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Transfer host &amp; leave
                </p>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  Select a participant to become the new host. You will leave after the transfer.
                </p>
                <ul className="space-y-2">
                  {otherParticipants.map((user) => {
                    const userLabel = getPresenceUserLabel(user);
                    const userId = user.userId!;

                    return (
                      <li key={userId}>
                        <button
                          type="button"
                          onClick={() => onTransferAndLeave(userId)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-amber-900/50 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
                        >
                          Transfer to {userLabel} &amp; leave
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
              </div>
            ) : null}

            <div className={hasOtherParticipants ? "" : "mt-5"}>
              <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                End meeting for all
              </p>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                This will immediately close the meeting for all participants.
              </p>
              <button
                type="button"
                onClick={handleOpenConfirmEnd}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                End meeting for all
              </button>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              End meeting for all?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              All participants will be immediately disconnected and the room will be closed. This
              cannot be undone.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onEndMeeting}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                End meeting for all
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HostLeaveDialog;
