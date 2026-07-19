import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  enabled: boolean;
  muted: boolean;
  deviceId?: string;
};

export function useMeetingMicLevel({ enabled, muted, deviceId }: Options) {
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const speakingRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setLevel(0);
    speakingRef.current = 0;
  }, []);

  const pulseSpeaking = useCallback((amount = 0.85) => {
    speakingRef.current = Math.max(speakingRef.current, amount);
  }, []);

  useEffect(() => {
    if (!enabled || muted) {
      stop();
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: deviceId ? { deviceId: { ideal: deviceId } } : true,
          video: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const ctx = new AudioContext();
        await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled || !analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(data);
          let sum = 0;
          const startBin = 2;
          const endBin = Math.min(40, data.length);
          for (let i = startBin; i < endBin; i += 1) sum += data[i];
          const avg = sum / (endBin - startBin);
          const micLevel = Math.min(1, avg / 42);

          speakingRef.current *= 0.78;
          const blended = Math.max(micLevel, speakingRef.current);
          setLevel(blended);

          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!cancelled) {
          const decay = () => {
            if (cancelled) return;
            speakingRef.current *= 0.78;
            setLevel(speakingRef.current);
            rafRef.current = requestAnimationFrame(decay);
          };
          decay();
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [deviceId, enabled, muted, stop]);

  return { level, pulseSpeaking, stop };
}
