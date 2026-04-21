import type { ReactNode } from "react";

export type SmIconName =
  | "lock"
  | "shield"
  | "clock"
  | "users"
  | "screen"
  | "chat"
  | "mic"
  | "micOff"
  | "video"
  | "videoOff"
  | "check"
  | "x"
  | "arrow"
  | "plus"
  | "copy"
  | "send"
  | "more"
  | "chevR"
  | "logout"
  | "sparkle";

const paths: Record<SmIconName, ReactNode> = {
  lock: (
    <g>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </g>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  clock: (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </g>
  ),
  users: (
    <g>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </g>
  ),
  screen: (
    <g>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </g>
  ),
  chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  mic: (
    <g>
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3" />
    </g>
  ),
  micOff: (
    <g>
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6" />
      <path d="M19 10v2a7 7 0 01-.11 1.23M12 19v3M5 10v2a7 7 0 0010.77 5.89" />
      <path d="M3 3l18 18" />
    </g>
  ),
  video: (
    <g>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </g>
  ),
  videoOff: (
    <g>
      <path d="M16 8v-1a2 2 0 00-2-2H5M23 7l-7 5 7 5V7zM15 15v2a2 2 0 01-2 2H3a2 2 0 01-2-2V9" />
      <path d="M3 3l18 18" />
    </g>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <g>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </g>
  ),
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  more: (
    <g>
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
    </g>
  ),
  chevR: <path d="M9 18l6-6-6-6" />,
  logout: <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.64 5.64l2.83 2.83M15.54 15.54l2.83 2.83M5.64 18.36l2.83-2.83M15.54 8.46l2.83-2.83" />,
};

type SmIconProps = {
  name: SmIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export default function SmIcon({ name, size = 18, strokeWidth = 1.6, className }: SmIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
