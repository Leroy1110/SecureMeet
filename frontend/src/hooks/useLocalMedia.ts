import { useCallback, useEffect, useRef, useState } from "react";

export type LocalMediaOptions = {
  audioEnabled: boolean;
  videoEnabled: boolean;
};

export type UseLocalMediaResult = {
  localStream: MediaStream | null;
  mediaLoading: boolean;
  mediaError: string;
  mediaReady: boolean;
  mediaDisabled: boolean;
  startLocalMedia: (options: LocalMediaOptions) => Promise<void>;
  stopLocalMedia: () => void;
};

const GENERIC_MEDIA_ERROR = "Unable to access camera or microphone. Please check your browser and device settings.";

const getMediaErrorMessage = (error: unknown): string => {
  const errorName =
    typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";

  if (errorName === "NotAllowedError") {
    return "Camera and microphone access was denied. Please enable permissions in your browser.";
  }

  if (errorName === "NotFoundError") {
    return "No camera or microphone device found.";
  }

  if (errorName === "NotReadableError") {
    return "Camera or microphone is already in use by another application.";
  }

  if (errorName === "OverconstrainedError") {
    return "Your selected camera or microphone settings are not supported on this device.";
  }

  if (errorName === "AbortError") {
    return "Camera or microphone initialization was interrupted. Please try again.";
  }

  return GENERIC_MEDIA_ERROR;
};

const buildMediaKey = (options: LocalMediaOptions): string =>
  `${options.audioEnabled ? "1" : "0"}:${options.videoEnabled ? "1" : "0"}`;

export const useLocalMedia = (): UseLocalMediaResult => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaDisabled, setMediaDisabled] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const activeMediaKeyRef = useRef<string | null>(null);
  const pendingMediaKeyRef = useRef<string | null>(null);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }, []);

  const stopLocalMedia = useCallback(() => {
    requestIdRef.current += 1;
    pendingMediaKeyRef.current = null;
    activeMediaKeyRef.current = null;

    stopTracks(streamRef.current);
    streamRef.current = null;

    setLocalStream(null);
    setMediaLoading(false);
    setMediaReady(false);
    setMediaError("");
    setMediaDisabled(false);
  }, [stopTracks]);

  const startLocalMedia = useCallback(
    async (options: LocalMediaOptions) => {
      const normalizedOptions: LocalMediaOptions = {
        audioEnabled: Boolean(options.audioEnabled),
        videoEnabled: Boolean(options.videoEnabled),
      };
      const mediaKey = buildMediaKey(normalizedOptions);

      if (!normalizedOptions.audioEnabled && !normalizedOptions.videoEnabled) {
        requestIdRef.current += 1;
        pendingMediaKeyRef.current = null;
        activeMediaKeyRef.current = mediaKey;

        stopTracks(streamRef.current);
        streamRef.current = null;

        setLocalStream(null);
        setMediaLoading(false);
        setMediaReady(false);
        setMediaError("");
        setMediaDisabled(true);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setLocalStream(null);
        setMediaLoading(false);
        setMediaReady(false);
        setMediaDisabled(false);
        setMediaError("This browser does not support camera or microphone access.");
        return;
      }

      if (!window.isSecureContext) {
        setLocalStream(null);
        setMediaLoading(false);
        setMediaReady(false);
        setMediaDisabled(false);
        setMediaError("Camera and microphone require a secure connection (HTTPS or localhost).");
        return;
      }

      if (activeMediaKeyRef.current === mediaKey && streamRef.current) {
        return;
      }

      if (pendingMediaKeyRef.current === mediaKey) {
        return;
      }

      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      pendingMediaKeyRef.current = mediaKey;
      activeMediaKeyRef.current = null;

      stopTracks(streamRef.current);
      streamRef.current = null;

      setLocalStream(null);
      setMediaLoading(true);
      setMediaReady(false);
      setMediaError("");
      setMediaDisabled(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: normalizedOptions.audioEnabled,
          video: normalizedOptions.videoEnabled,
        });

        if (requestIdRef.current !== requestId) {
          stopTracks(stream);
          return;
        }

        pendingMediaKeyRef.current = null;
        activeMediaKeyRef.current = mediaKey;
        streamRef.current = stream;

        setLocalStream(stream);
        setMediaLoading(false);
        setMediaReady(true);
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        pendingMediaKeyRef.current = null;
        activeMediaKeyRef.current = null;
        streamRef.current = null;

        setLocalStream(null);
        setMediaLoading(false);
        setMediaReady(false);
        setMediaDisabled(false);
        setMediaError(getMediaErrorMessage(error));
      }
    },
    [stopTracks]
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      pendingMediaKeyRef.current = null;
      activeMediaKeyRef.current = null;
      stopTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [stopTracks]);

  return {
    localStream,
    mediaLoading,
    mediaError,
    mediaReady,
    mediaDisabled,
    startLocalMedia,
    stopLocalMedia,
  };
};
