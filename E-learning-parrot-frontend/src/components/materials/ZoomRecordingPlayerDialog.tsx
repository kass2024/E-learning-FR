import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, MonitorPlay, RefreshCw } from "lucide-react";
import { getRecordingStreamUrl, type ZoomRecordingFile } from "@/api/axios";
import { listVideoFiles, videoLabel } from "@/components/materials/recordingUtils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | null;
  files?: ZoomRecordingFile[];
  fallbackDownloadUrl?: string | null;
  fallbackPlayUrl?: string | null;
};

export function ZoomRecordingPlayerDialog({
  open,
  onOpenChange,
  title,
  files = [],
  fallbackDownloadUrl,
  fallbackPlayUrl,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoOptions = useMemo(() => listVideoFiles(files), [files]);
  const [selectedVideoKey, setSelectedVideoKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const best = videoOptions[0];
    setSelectedVideoKey(best?.id ?? best?.recording_type ?? "0");
  }, [open, videoOptions.length]);

  const selectedVideo =
    videoOptions.find((f) => (f.id ?? f.recording_type) === selectedVideoKey) ?? videoOptions[0] ?? null;

  const sourceUrl = selectedVideo?.download_url || selectedVideo?.play_url || fallbackDownloadUrl || fallbackPlayUrl;
  const streamUrl = sourceUrl ? getRecordingStreamUrl(sourceUrl) : null;

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setError(null);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
      return;
    }

    setLoading(true);
    setError(null);
  }, [open, streamUrl, reloadToken, selectedVideoKey]);

  const handleRetry = () => {
    setReloadToken((value) => value + 1);
  };

  const isActiveSpeaker = (selectedVideo?.recording_type ?? "").toLowerCase().includes("active_speaker");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>{title || "Meeting recording"}</DialogTitle>
          <DialogDescription>Watch the cloud recording in your browser.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {videoOptions.length > 1 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MonitorPlay className="h-4 w-4 text-primary" />
                Recording view
              </div>
              <Select value={selectedVideoKey} onValueChange={setSelectedVideoKey}>
                <SelectTrigger className="w-full sm:w-[280px] bg-background">
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
              Active speaker view may be a black screen when cameras were off. Switch to{" "}
              <strong>Screen + speakers</strong> for slides and participants.
            </p>
          )}

          <div className="relative overflow-hidden rounded-xl border bg-black shadow-inner min-h-[280px]">
            {streamUrl ? (
              <>
                <video
                  ref={videoRef}
                  key={`${streamUrl}-${selectedVideoKey}-${reloadToken}`}
                  src={streamUrl}
                  controls
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  className="w-full max-h-[70vh] bg-black"
                  onLoadedData={() => {
                    setLoading(false);
                    setError(null);
                  }}
                  onCanPlay={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError("Unable to load this recording. Try another view or refresh.");
                  }}
                />

                {loading && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <span className="text-sm">Loading recording...</span>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white px-6 text-center">
                    <AlertCircle className="h-10 w-10 text-red-300" />
                    <p className="text-sm">{error}</p>
                    <Button size="sm" variant="secondary" className="gap-1.5" onClick={handleRetry}>
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-sm text-white/80">
                No playable recording file is available for this meeting.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
