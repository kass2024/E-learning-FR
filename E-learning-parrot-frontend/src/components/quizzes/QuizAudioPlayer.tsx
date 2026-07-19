import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Headphones, Cloud } from "lucide-react";
import { resolveQuizAudioUrl, isPcloudAudioRef } from "@/lib/quizAudioUtils";

type Props = {
  src: string;
  courseId: number;
  filename?: string;
  label?: string;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const QuizAudioPlayer = ({ src, courseId, filename, label = "Listen to the audio" }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const url = resolveQuizAudioUrl(src, courseId, { filename });

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !url) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  };

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Audio unavailable â€” re-upload the file.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Headphones className="h-4 w-4 shrink-0" />
          {label}
        </div>
        {isPcloudAudioRef(src) && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Cloud className="h-3 w-3" />
            pCloud
          </span>
        )}
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (!el || !el.duration) return;
          setProgress((el.currentTime / el.duration) * 100);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
      />
      <div className="flex items-center gap-3">
        <Button type="button" size="icon" variant="secondary" className="rounded-full h-10 w-10 shrink-0" onClick={toggle}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {duration ? formatDuration(duration) : "â€”"}
        </span>
      </div>
    </div>
  );
};

export default QuizAudioPlayer;
