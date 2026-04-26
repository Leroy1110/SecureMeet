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
  audioMuted: boolean;
  videoOff: boolean;
  hasAudioDevice: boolean;
  hasVideoDevice: boolean;
  startLocalMedia: (options: LocalMediaOptions) => Promise<void>;
  stopLocalMedia: () => void;
  setAudioMuted: (muted: boolean) => void;
  setVideoOff: (off: boolean) => void;
  replaceLocalVideoTrack: (newTrack: MediaStreamTrack) => void;
  restoreCameraTrack: () => MediaStreamTrack | null;
  getCameraVideoTrack: () => MediaStreamTrack | null;
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

const stopTrackSafely = (track: MediaStreamTrack | null) => {
  if (!track) {
    return;
  }
  try {
    track.stop();
  } catch {
    // ignore
  }
};

const tryGetUserMedia = async (
  constraints: MediaStreamConstraints
): Promise<MediaStream | null> => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return null;
  }
};

export const useLocalMedia = (): UseLocalMediaResult => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaDisabled, setMediaDisabled] = useState(false);
  const [audioMuted, setAudioMutedState] = useState(false);
  const [videoOff, setVideoOffState] = useState(false);
  const [hasAudioDevice, setHasAudioDevice] = useState(false);
  const [hasVideoDevice, setHasVideoDevice] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoOffRef = useRef(false);
  const requestIdRef = useRef(0);
  const pendingRef = useRef(false);

  const disposeTracks = useCallback(() => {
    stopTrackSafely(audioTrackRef.current);
    stopTrackSafely(cameraVideoTrackRef.current);
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        stopTrackSafely(track);
      }
    }
    audioTrackRef.current = null;
    cameraVideoTrackRef.current = null;
    streamRef.current = null;
  }, []);

  const stopLocalMedia = useCallback(() => {
    requestIdRef.current += 1;
    pendingRef.current = false;
    disposeTracks();
    setLocalStream(null);
    setMediaLoading(false);
    setMediaReady(false);
    setMediaError("");
    setMediaDisabled(false);
    setHasAudioDevice(false);
    setHasVideoDevice(false);
    setAudioMutedState(false);
    setVideoOffState(false);
    videoOffRef.current = false;
  }, [disposeTracks]);

  const startLocalMedia = useCallback(
    async (options: LocalMediaOptions) => {
      if (pendingRef.current) {
        return;
      }

      if (streamRef.current) {
        // Already have a stream — just reconcile enabled states with prefs.
        const audioTrack = audioTrackRef.current;
        const videoTrack = cameraVideoTrackRef.current;
        if (audioTrack) {
          audioTrack.enabled = options.audioEnabled;
          setAudioMutedState(!options.audioEnabled);
        }
        if (videoTrack) {
          videoTrack.enabled = options.videoEnabled;
          setVideoOffState(!options.videoEnabled);
          videoOffRef.current = !options.videoEnabled;
        }
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setLocalStream(null);
        setMediaLoading(false);
        setMediaReady(false);
        setMediaDisabled(false);
        setHasAudioDevice(false);
        setHasVideoDevice(false);
        setMediaError("This browser does not support camera or microphone access.");
        return;
      }

      if (!window.isSecureContext) {
        setLocalStream(null);
        setMediaLoading(false);
        setMediaReady(false);
        setMediaDisabled(false);
        setHasAudioDevice(false);
        setHasVideoDevice(false);
        setMediaError("Camera and microphone require a secure connection (HTTPS or localhost).");
        return;
      }

      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      pendingRef.current = true;

      setLocalStream(null);
      setMediaLoading(true);
      setMediaReady(false);
      setMediaError("");
      setMediaDisabled(false);

      // Always try to acquire both so a video sender exists for later screen
      // share replacement and toggles don't need re-permissioning.
      let stream = await tryGetUserMedia({ audio: true, video: true });
      let fallbackError: unknown = null;

      if (!stream) {
        stream = await tryGetUserMedia({ audio: true, video: false });
      }

      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        } catch (error) {
          fallbackError = error;
          stream = null;
        }
      }

      if (requestIdRef.current !== requestId) {
        if (stream) {
          for (const track of stream.getTracks()) {
            stopTrackSafely(track);
          }
        }
        pendingRef.current = false;
        return;
      }

      if (!stream) {
        pendingRef.current = false;
        setMediaLoading(false);
        setMediaReady(false);
        setMediaDisabled(false);
        setHasAudioDevice(false);
        setHasVideoDevice(false);
        setMediaError(getMediaErrorMessage(fallbackError));
        return;
      }

      const audioTrack = stream.getAudioTracks()[0] ?? null;
      const videoTrack = stream.getVideoTracks()[0] ?? null;

      if (audioTrack) {
        audioTrack.enabled = options.audioEnabled;
      }
      if (videoTrack) {
        videoTrack.enabled = options.videoEnabled;
      }

      audioTrackRef.current = audioTrack;
      cameraVideoTrackRef.current = videoTrack;
      streamRef.current = stream;
      pendingRef.current = false;

      setLocalStream(stream);
      setMediaLoading(false);
      setMediaReady(true);
      setMediaDisabled(false);
      setHasAudioDevice(Boolean(audioTrack));
      setHasVideoDevice(Boolean(videoTrack));
      setAudioMutedState(audioTrack ? !options.audioEnabled : true);
      setVideoOffState(videoTrack ? !options.videoEnabled : true);
      videoOffRef.current = videoTrack ? !options.videoEnabled : true;
    },
    []
  );

  const setAudioMuted = useCallback((muted: boolean) => {
    const track = audioTrackRef.current;
    if (!track) {
      return;
    }
    track.enabled = !muted;
    setAudioMutedState(muted);
  }, []);

  const setVideoOff = useCallback((off: boolean) => {
    const track = cameraVideoTrackRef.current;
    if (!track) {
      return;
    }
    track.enabled = !off;
    setVideoOffState(off);
    videoOffRef.current = off;
  }, []);

  const replaceLocalVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
    let stream = streamRef.current;
    if (!stream) {
      stream = new MediaStream();
      if (audioTrackRef.current) {
        stream.addTrack(audioTrackRef.current);
      }
    }
    for (const track of stream.getVideoTracks()) {
      stream.removeTrack(track);
    }
    stream.addTrack(newTrack);
    // A MediaStream mutation doesn't re-fire React state. Create a cloned
    // wrapper MediaStream so <video>.srcObject rebinds to show the new track.
    const nextStream = new MediaStream(stream.getTracks());
    streamRef.current = nextStream;
    setLocalStream(nextStream);
  }, []);

  const restoreCameraTrack = useCallback((): MediaStreamTrack | null => {
    let stream = streamRef.current;
    const cameraTrack = cameraVideoTrackRef.current;
    if (!stream) {
      stream = new MediaStream();
      if (audioTrackRef.current) {
        stream.addTrack(audioTrackRef.current);
      }
    }
    for (const track of stream.getVideoTracks()) {
      if (track !== cameraTrack) {
        stopTrackSafely(track);
      }
      stream.removeTrack(track);
    }
    if (cameraTrack) {
      cameraTrack.enabled = !videoOffRef.current;
      stream.addTrack(cameraTrack);
    }
    const nextStream = new MediaStream(stream.getTracks());
    streamRef.current = nextStream;
    setLocalStream(nextStream);
    return cameraTrack;
  }, []);

  const getCameraVideoTrack = useCallback((): MediaStreamTrack | null => {
    return cameraVideoTrackRef.current;
  }, []);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      pendingRef.current = false;
      disposeTracks();
    };
  }, [disposeTracks]);

  return {
    localStream,
    mediaLoading,
    mediaError,
    mediaReady,
    mediaDisabled,
    audioMuted,
    videoOff,
    hasAudioDevice,
    hasVideoDevice,
    startLocalMedia,
    stopLocalMedia,
    setAudioMuted,
    setVideoOff,
    replaceLocalVideoTrack,
    restoreCameraTrack,
    getCameraVideoTrack,
  };
};
