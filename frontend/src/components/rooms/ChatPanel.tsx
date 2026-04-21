import { type Dispatch, type FormEvent, type SetStateAction } from "react";
import { type ChatMessage, type ChatRecipientOption } from "../../hooks/useRoomSocket";
import { SmButton, SmIcon } from "../sm";

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
    return `→ ${message.to_display_name}`;
  }

  return `→ User ${message.to_user_id}`;
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
  const inputsDisabled = !canSendChat || !isSocketOpen;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        minHeight: 0,
      }}
    >
      {chatError ? (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--sm-danger-soft)",
            color: "var(--sm-danger)",
            fontSize: 13,
          }}
        >
          {chatError}
        </div>
      ) : null}

      {!canSendChat ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--sm-warn-soft)",
            color: "var(--sm-warn)",
            fontSize: 13,
          }}
        >
          You can send messages once your room session is active.
        </div>
      ) : null}

      <div
        style={{
          minHeight: 0,
          flex: 1,
          overflowY: "auto",
          padding: 14,
          borderRadius: 20,
          background: "var(--sm-bg-sunken)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {chatMessages.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: "var(--sm-fg-muted)",
              margin: "auto 0",
              textAlign: "center",
            }}
          >
            No messages yet. Say hi.
          </p>
        ) : (
          chatMessages.map((message, index) => {
            const isPrivate = message.to_user_id !== null;
            return (
              <div
                key={`${message.from_user_id ?? "unknown"}:${message.created_at}:${index}`}
                style={{
                  background: "#fff",
                  padding: "10px 12px",
                  borderRadius: 14,
                  boxShadow: "inset 0 0 0 1px var(--sm-line)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "var(--sm-fg-subtle)",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: "var(--sm-fg)", fontWeight: 600 }}>
                    {getSenderLabel(message)}
                  </span>
                  <span>·</span>
                  <span style={{ color: isPrivate ? "var(--sm-accent)" : "var(--sm-fg-subtle)" }}>
                    {getTargetLabel(message)}
                  </span>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    color: "var(--sm-fg)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {message.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <select
            value={selectedRecipientUserId === null ? "public" : String(selectedRecipientUserId)}
            onChange={(event) => setSelectedRecipientFromValue(event.target.value)}
            disabled={inputsDisabled}
            className="sm-input"
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              paddingRight: 36,
              cursor: inputsDisabled ? "not-allowed" : "pointer",
            }}
          >
            <option value="public">Send to everyone</option>
            {chatRecipientOptions.map((option) => (
              <option key={option.userId} value={option.userId}>
                Private: {option.label}
              </option>
            ))}
          </select>
          <span
            style={{
              position: "absolute",
              right: 12,
              top: 0,
              bottom: 0,
              display: "inline-flex",
              alignItems: "center",
              color: "var(--sm-fg-subtle)",
              pointerEvents: "none",
            }}
          >
            <SmIcon name="chevR" size={14} />
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            disabled={inputsDisabled}
            placeholder={canSendChat ? "Type a message…" : "Messaging disabled until active"}
            className="sm-input"
            style={{ flex: 1 }}
          />
          <SmButton
            type="submit"
            variant="primary"
            size="md"
            disabled={inputsDisabled}
            icon="send"
          >
            Send
          </SmButton>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
