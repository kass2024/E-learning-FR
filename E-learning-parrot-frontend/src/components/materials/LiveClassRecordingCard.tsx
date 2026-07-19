import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays,
  Clock3,
  Download,
  ExternalLink,
  GraduationCap,
  Mic2,
  MonitorPlay,
  PlayCircle,
} from "lucide-react";
import {
  getRecordingDownloadUrl,
  getRecordingStreamUrl,
  type LearnerRecording,
} from "@/api/axios";
import {
  formatRecordingWhen,
  listVideoFiles,
  pickAudio,
  videoLabel,
} from "@/components/materials/recordingUtils";

type Props = {
  recording: LearnerRecording;
  sessionTitle?: string | null;
  compact?: boolean;
};

export function LiveClassRecordingCard({ recording, sessionTitle, compact = false }: Props) {
  const videoOptions = listVideoFiles(recording.files ?? []);
  const [selectedVideoKey, setSelectedVideoKey] = useState("");

  useEffect(() => {
    const best = videoOptions[0];
    setSelectedVideoKey(best?.id ?? best?.recording_type ?? "0");
  }, [recording.uuid, recording.id, videoOptions.length]);

  const selectedVideo =
    videoOptions.find((f) => (f.id ?? f.recording_type) === selectedVideoKey) ?? videoOptions[0] ?? null;

  const audio = pickAudio(recording.files ?? []);
  const streamUrl = selectedVideo?.download_url ? getRecordingStreamUrl(selectedVideo.download_url) : null;
  const downloadUrl = selectedVideo?.download_url ? getRecordingDownloadUrl(selectedVideo.download_url) : null;
  const audioStreamUrl = audio?.download_url ? getRecordingStreamUrl(audio.download_url) : null;
  const isActiveSpeaker = (selectedVideo?.recording_type ?? "").toLowerCase().includes("active_speaker");
  const title = recording.topic || sessionTitle || "Live class recording";

  return (
    <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white shadow-sm transition hover:shadow-md">
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-sky-600 hover:bg-sky-600 text-white border-0">
                <GraduationCap className="h-3.5 w-3.5 mr-1" />
                Live class recording
              </Badge>
              {recording.duration ? (
                <Badge variant="outline" className="bg-white/70">
                  <Clock3 className="h-3 w-3 mr-1" />
                  {recording.duration} min
                </Badge>
              ) : null}
            </div>
            <CardTitle className={compact ? "text-base leading-snug" : "text-lg leading-snug"}>{title}</CardTitle>
            {sessionTitle && sessionTitle !== title && (
              <p className="text-xs text-muted-foreground">{sessionTitle}</p>
            )}
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatRecordingWhen(recording.start_time)}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {videoOptions.length > 1 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-white/70 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-sky-700">
              <MonitorPlay className="h-4 w-4" />
              Recording view
            </div>
            <Select value={selectedVideoKey} onValueChange={setSelectedVideoKey}>
              <SelectTrigger className="w-full sm:w-[260px] bg-white">
                <SelectValue placeholder="Choose view" />
              </SelectTrigger>
              <SelectContent>
                {videoOptions.map((file, index) => {
                  const key = file.id ?? file.recording_type ?? String(index);
                  return (
                    <SelectItem key={key} value={key}>
                      {videoLabel(file)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {isActiveSpeaker && (
          <p className="text-xs rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            Active speaker view may show a black screen when cameras were off. Switch to{" "}
            <strong>Screen + speakers</strong> for slides and participants.
          </p>
        )}

        {streamUrl ? (
          <div className="overflow-hidden rounded-xl border bg-black shadow-inner">
            <video
              key={`${streamUrl}-${selectedVideoKey}`}
              src={streamUrl}
              controls
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              className={`w-full bg-black ${compact ? "max-h-[280px]" : "max-h-[420px]"}`}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground bg-white/60">
            <PlayCircle className="h-8 w-8 mx-auto mb-2 text-sky-400" />
            Video is still processing or unavailable.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {selectedVideo?.play_url && (
            <Button asChild size="sm" variant="secondary" className="gap-1.5">
              <a href={selectedVideo.play_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open in Zoom
              </a>
            </Button>
          )}
          {downloadUrl && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 bg-white/80">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          )}
        </div>

        {audioStreamUrl && (
          <div className="rounded-lg border bg-white/70 p-3 space-y-2">
            <p className="text-xs font-medium inline-flex items-center gap-1 text-sky-700">
              <Mic2 className="h-3.5 w-3.5" />
              Audio-only track
            </p>
            <audio controls preload="metadata" crossOrigin="anonymous" className="w-full">
              <source src={audioStreamUrl} />
            </audio>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
