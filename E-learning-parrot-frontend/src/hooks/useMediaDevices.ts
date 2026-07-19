import { useCallback, useEffect, useRef, useState } from "react";

export type MediaDevicePreferences = {
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
  startWithAudio: boolean;
  startWithVideo: boolean;
};

export type DeviceLists = {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
};

const emptyLists: DeviceLists = {
  audioInputs: [],
  videoInputs: [],
  audioOutputs: [],
};

function groupDevices(devices: MediaDeviceInfo[]): DeviceLists {
  return {
    audioInputs: devices.filter((d) => d.kind === "audioinput"),
    videoInputs: devices.filter((d) => d.kind === "videoinput"),
    audioOutputs: devices.filter((d) => d.kind === "audiooutput"),
  };
}

function deviceLabel(device: MediaDeviceInfo, fallback: string) {
  const label = device.label?.trim();
  return label || fallback;
}

export function useMediaDevices() {
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<DeviceLists>(emptyLists);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const [audioInputId, setAudioInputId] = useState("");
  const [videoInputId, setVideoInputId] = useState("");
  const [audioOutputId, setAudioOutputId] = useState("");
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopLevelMonitor = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    stopLevelMonitor();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setPreviewStream(null);
    setAudioLevel(0);
  }, [stopLevelMonitor]);

  const startLevelMonitor = useCallback((stream: MediaStream) => {
    stopLevelMonitor();
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      // Resume in case the browser created the context suspended (autoplay policy).
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        if (audioCtxRef.current?.state === "suspended") {
          void audioCtxRef.current.resume().catch(() => undefined);
        }
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
        setAudioLevel(Math.min(1, avg / 90));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Web Audio optional
    }
  }, [stopLevelMonitor]);

  const refreshDevices = useCallback(async (requestPermission = false) => {
    setLoading(true);
    setPermissionError(null);
    try {
      if (requestPermission) {
        try {
          const temp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          temp.getTracks().forEach((t) => t.stop());
        } catch {
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioOnly.getTracks().forEach((t) => t.stop());
          } catch {
            setPermissionError("Allow microphone access to select audio devices.");
          }
        }
      }

      const list = await navigator.mediaDevices.enumerateDevices();
      const grouped = groupDevices(list);
      setDevices(grouped);

      setAudioInputId((prev) => prev || grouped.audioInputs[0]?.deviceId || "");
      setVideoInputId((prev) => prev || grouped.videoInputs[0]?.deviceId || "");
      setAudioOutputId((prev) => prev || grouped.audioOutputs[0]?.deviceId || "");
      // Mirror Zoom: no camera → join with video off (do not block).
      if (grouped.videoInputs.length === 0) {
        setVideoOn(false);
      }
      if (grouped.audioInputs.length === 0) {
        setAudioOn(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const startPreview = useCallback(
    async (nextAudioOn: boolean, nextVideoOn: boolean, audioId: string, videoId: string) => {
      stopPreview();

      const constraints: MediaStreamConstraints = {
        audio: nextAudioOn && audioId
          ? { deviceId: { exact: audioId } }
          : nextAudioOn,
        video: nextVideoOn && videoId
          ? { deviceId: { exact: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : nextVideoOn,
      };

      if (!nextAudioOn && !nextVideoOn) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setPreviewStream(stream);
        if (nextAudioOn) startLevelMonitor(stream);
      } catch {
        if (nextVideoOn && videoId) {
          try {
            const fallback = await navigator.mediaDevices.getUserMedia({
              audio: nextAudioOn,
              video: true,
            });
            streamRef.current = fallback;
            setPreviewStream(fallback);
            if (nextAudioOn) startLevelMonitor(fallback);
          } catch {
            setPermissionError("Could not access camera or microphone.");
          }
        }
      }
    },
    [startLevelMonitor, stopPreview],
  );

  useEffect(() => {
    void refreshDevices(true);
    const onDeviceChange = () => void refreshDevices(false);
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      stopPreview();
    };
  }, [refreshDevices, stopPreview]);

  useEffect(() => {
    if (loading) return;
    void startPreview(audioOn, videoOn, audioInputId, videoInputId);
  }, [audioInputId, videoInputId, audioOn, videoOn, loading, startPreview]);

  const buildPreferences = useCallback((): MediaDevicePreferences => {
    return {
      audioInputId,
      videoInputId,
      audioOutputId,
      startWithAudio: audioOn,
      startWithVideo: videoOn && devices.videoInputs.length > 0,
    };
  }, [audioInputId, videoInputId, audioOutputId, audioOn, videoOn, devices.videoInputs.length]);

  return {
    devices,
    loading,
    permissionError,
    previewStream,
    audioLevel,
    audioOn,
    videoOn,
    audioInputId,
    videoInputId,
    audioOutputId,
    setAudioOn,
    setVideoOn,
    setAudioInputId,
    setVideoInputId,
    setAudioOutputId,
    refreshDevices,
    stopPreview,
    buildPreferences,
    deviceLabel,
    hasCamera: devices.videoInputs.length > 0,
    hasMicrophone: devices.audioInputs.length > 0,
  };
}
