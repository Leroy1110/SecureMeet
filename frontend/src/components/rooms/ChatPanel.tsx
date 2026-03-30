import { type Dispatch, type FormEvent, type SetStateAction } from "react";
import { type ChatMessage, type ChatRecipientOption } from "../../hooks/useRoomSocket";

type ChatPanelProps = {
  chatMessages: ChatMessage[];
  chatError: string;
  canSendChat: boolean;
  isSocketOpen: boolean;
  selectedRecipientUserId: number | null;
  chatRecipientOptions: ChatRecipientOption[];
  chatInput: string;
  setSelectedRecipientFromValue: (value: string) => void;
  setChatInput: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const getSenderLabel = (message: ChatMessage): string => {
  if (message.from_display_name.trim()) {
    return message.from_display_name;
  }

  if (message.from_user_id !== null) {
    return `User ${message.from_user_id}`;
  }

  return "Unknown";
};

const getTargetLabel = (message: ChatMessage): string => {
  if (message.to_user_id === null) {
    return "Public";
  }

  if (message.to_display_name.trim()) {
    return `Private to ${message.to_display_name}`;
  }

  return `Private to User ${message.to_user_id}`;
};

const ChatPanel = ({
  chatMessages,
  chatError,
  canSendChat,
  isSocketOpen,
  selectedRecipientUserId,
  chatRecipientOptions,
  chatInput,
  setSelectedRecipientFromValue,
  setChatInput,
  onSubmit,
}: ChatPanelProps) => {
  return (
    <div className="space-y-4">
      {chatError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {chatError}
        </p>
      ) : null}

      {!canSendChat ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/50 dark:text-amber-300">
          You can send messages once your room session is active.
        </p>
      ) : null}

      <div className="max-h-[45vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        {chatMessages.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No messages yet.</p>
        ) : (
          <ul className="space-y-2">
            {chatMessages.map((message, index) => (
              <li
                key={`${message.from_user_id ?? "unknown"}:${message.created_at}:${index}`}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  {getSenderLabel(message)} • {getTargetLabel(message)}
                  {message.created_at ? ` • ${message.created_at}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">
                  {message.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <select
          value={selectedRecipientUserId === null ? "public" : String(selectedRecipientUserId)}
          onChange={(event) => setSelectedRecipientFromValue(event.target.value)}
          disabled={!canSendChat || !isSocketOpen}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
        >
          <option value="public">Public</option>
          {chatRecipientOptions.map((option) => (
            <option key={option.userId} value={option.userId}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            disabled={!canSendChat || !isSocketOpen}
            placeholder={canSendChat ? "Type a message" : "Messaging disabled until active"}
            className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
          />
          <button
            type="submit"
            disabled={!canSendChat || !isSocketOpen}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900 dark:hover:bg-blue-800"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
