import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square, Trash2, CheckCircle2 } from "lucide-react";
import { resolveQuizAudioUrl } from "@/lib/quizAudioUtils";

type Props = {
  disabled?: boolean;
  value?: string;
  courseId: number;
  onRecorded: (answerValue: string) => void;
  onClear?: () => void;
  uploadAudio: (blob: Blob) => Promise<{ answer_value: string }>;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const QuizAudioRecorder = ({ disabled, value, courseId, onRecorded, onClear, uploadAudio }: Props) => {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 500) {
          setError("Recording too short. Try again.");
          return;
        }
        setUploading(true);
        try {
          const res = await uploadAudio(blob);
          onRecorded(res.answer_value);
        } catch {
          setError("Could not upload recording. Check microphone permission and try again.");
        } finally {
          setUploading(false);
        }
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Allow microphone in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRef.current?.stop();
    setRecording(false);
  };

  const hasRecording = !!value?.startsWith("audio:");

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-medium text-primary">Record your oral answer</p>

      {hasRecording ? (
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">Recording saved</span>
          {value && (
            <audio controls className="h-9 max-w-full" src={resolveQuizAudioUrl(value, courseId) ?? undefined} />
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => {
              onClear?.();
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Re-record
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {!recording ? (
            <Button type="button" disabled={disabled || uploading} onClick={() => void startRecording()} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {uploading ? "Uploadingâ€¦" : "Tap to record"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="destructive" disabled={uploading} onClick={stopRecording} className="gap-2">
                <Square className="h-4 w-4" />
                Stop ({formatDuration(seconds)})
              </Button>
              <span className="text-xs text-muted-foreground animate-pulse">Recordingâ€¦ speak clearly</span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default QuizAudioRecorder;
