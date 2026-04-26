import { useCallback, useEffect, useRef, useState } from "react";

type UseScreenShareParams = {
  replaceVideoTrackForAllPeers: (newTrack: MediaStreamTrack | null) => void;
  replaceLocalVideoTrack: (newTrack: MediaStreamTrack) => void;
  restoreCameraTrack: () => MediaStreamTrack | null;
  sendScreenShareStart: () => boolean;
  sendScreenShareStop: () => boolean;
  forceStopScreenShareNonce: number;
};

export type UseScreenShareResult = {
  isSharing: boolean;
  canShareScreen: boolean;
  screenShareError: string;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
};

const getScreenShareErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "Screen sharing permission was denied.";
      case "NotFoundError":
        return "No screen source is available to share.";
      case "NotReadableError":
        return "Screen sharing is currently unavailable on this device.";
      default:
        break;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to start screen sharing.";
};

const stopStreamTracks = (stream: MediaStream | null) => {
  if (!stream) {
    return;
  }
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // no-op
    }
  }
};

export const useScreenShare = ({
  replaceVideoTrackForAllPeers,
  replaceLocalVideoTrack,
  restoreCameraTrack,
  sendScreenShareStart,
  sendScreenShareStop,
  forceStopScreenShareNonce,
}: UseScreenShareParams): UseScreenShareResult => {
  const [isSharing, setIsSharing] = useState(false);
  const [screenShareError, setScreenShareError] = useState("");
  const screenStreamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);
  const isMountedRef = useRef(true);
  const previousForceStopNonceRef = useRef(forceStopScreenShareNonce);
  const sendScreenShareStartRef = useRef(sendScreenShareStart);
  const sendScreenShareStopRef = useRef(sendScreenShareStop);
  const stopScreenShareRef = useRef<() => void>(() => {});

  const canShareScreen =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia);

  const stopScreenShare = useCallback(() => {
    if (stoppingRef.current) {
      return;
    }

    const activeScreenStream = screenStreamRef.current;
    if (!activeScreenStream) {
      if (isMountedRef.current) {
        setIsSharing(false);
      }
      return;
    }

    stoppingRef.current = true;
    try {
      const screenTrack = activeScreenStream.getVideoTracks()[0] ?? null;
      if (screenTrack) {
        screenTrack.onended = null;
      }

      stopStreamTracks(activeScreenStream);
      screenStreamRef.current = null;

      const cameraTrack = restoreCameraTrack();
      replaceVideoTrackForAllPeers(cameraTrack?.enabled ? cameraTrack : null);
      sendScreenShareStopRef.current();
    } catch (error) {
      if (isMountedRef.current) {
        setScreenShareError(
          getScreenShareErrorMessage(error) || "Failed to stop screen sharing cleanly."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsSharing(false);
      }
      stoppingRef.current = false;
    }
  }, [replaceVideoTrackForAllPeers, restoreCameraTrack]);

  const startScreenShare = useCallback(async () => {
    if (isSharing || stoppingRef.current) {
      return;
    }

    if (!canShareScreen) {
      setScreenShareError("This browser does not support screen sharing.");
      return;
    }

    setScreenShareError("");
    let displayStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0] ?? null;
      if (!screenTrack) {
        stopStreamTracks(displayStream);
        setScreenShareError("No video track was returned by screen sharing.");
        return;
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };

      screenStreamRef.current = displayStream;
      replaceVideoTrackForAllPeers(screenTrack);
      replaceLocalVideoTrack(screenTrack);
      const didSendStart = sendScreenShareStartRef.current();
      if (!didSendStart) {
        setScreenShareError("Failed to notify the room that screen sharing started.");
        stopScreenShare();
        return;
      }
      setIsSharing(true);
    } catch (error) {
      if (displayStream) {
        stopStreamTracks(displayStream);
      }
      setScreenShareError(getScreenShareErrorMessage(error));
    }
  }, [
    canShareScreen,
    isSharing,
    replaceLocalVideoTrack,
    replaceVideoTrackForAllPeers,
    stopScreenShare,
  ]);

  useEffect(() => {
    sendScreenShareStartRef.current = sendScreenShareStart;
  }, [sendScreenShareStart]);

  useEffect(() => {
    sendScreenShareStopRef.current = sendScreenShareStop;
  }, [sendScreenShareStop]);

  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

  useEffect(() => {
    const previousNonce = previousForceStopNonceRef.current;
    previousForceStopNonceRef.current = forceStopScreenShareNonce;

    if (!isSharing || forceStopScreenShareNonce === previousNonce) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      stopScreenShare();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [forceStopScreenShareNonce, isSharing, stopScreenShare]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopScreenShareRef.current();
    };
  }, []);

  return {
    isSharing,
    canShareScreen,
    screenShareError,
    startScreenShare,
    stopScreenShare,
  };
};
