import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays,
  Clock3,
  Download,
  ExternalLink,
  GraduationCap,
  Mic2,
  MonitorPlay,
  PlayCircle,
  Trash2,
  UserRound,
  Users,
  RefreshCw,
  Video,
} from "lucide-react";
import {
  deleteZoomCloudRecording,
  getRecordingDownloadUrl,
  getRecordingStreamUrl,
  getZoomRecordings,
  ZoomRecordingFile,
  ZoomRecordingItem,
} from "@/api/axios";

type SourceFilter = "all" | "webinar" | "live_class";

const sourceMeta = {
  webinar: {
    label: "Pathways Webinar",
    badgeClass: "bg-violet-600 hover:bg-violet-600 text-white border-0",
    cardClass: "border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-white",
    icon: Users,
    accent: "text-violet-700",
  },
  live_class: {
    label: "Live Class",
    badgeClass: "bg-sky-600 hover:bg-sky-600 text-white border-0",
    cardClass: "border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white",
    icon: GraduationCap,
    accent: "text-sky-700",
  },
} as const;

function recordingViewScore(file: ZoomRecordingFile): number {
  const fileType = (file.file_type ?? "").toUpperCase();
  if (fileType !== "MP4") return 0;

  const type = (file.recording_type ?? "").toLowerCase();
  if (type.includes("shared_screen_with_speaker_view")) return 100;
  if (type === "shared_screen" || type.includes("shared_screen_only")) return 95;
  if (type.includes("shared_screen_with_gallery_view")) return 90;
  if (type.includes("gallery_view")) return 65;
  if (type.includes("active_speaker")) return 35;
  return 50;
}

function listVideoFiles(files: ZoomRecordingFile[]): ZoomRecordingFile[] {
  return [...files]
    .filter((f) => f.file_type === "MP4" && (f.download_url || f.play_url))
    .sort((a, b) => recordingViewScore(b) - recordingViewScore(a));
}

function videoLabel(file: ZoomRecordingFile): string {
  return file.view_label || file.recording_type || "Video";
}

function pickAudio(files: ZoomRecordingFile[]): ZoomRecordingFile | null {
  return files.find((f) => f.file_type === "M4A") ?? null;
}

function formatWhen(value?: string | null) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useInView(rootMargin = "240px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

function isSameRecordingSession(a: ZoomRecordingItem, b: ZoomRecordingItem): boolean {
  const aUuid = a.uuid != null ? String(a.uuid).trim() : "";
  const bUuid = b.uuid != null ? String(b.uuid).trim() : "";
  if (aUuid && bUuid) {
    return aUuid === bUuid;
  }

  const aId = a.id != null ? String(a.id) : "";
  const bId = b.id != null ? String(b.id) : "";
  if (!aId || !bId || aId !== bId) {
    return false;
  }

  const aStart = a.start_time ?? "";
  const bStart = b.start_time ?? "";
  if (aStart && bStart) {
    return aStart === bStart;
  }

  return !aUuid && !bUuid;
}

function RecordingCard({
  item,
  onDeleted,
}: {
  item: ZoomRecordingItem;
  onDeleted: (deletedItem: ZoomRecordingItem) => void;
}) {
  const { toast } = useToast();
  const { ref: mediaRef, inView } = useInView();
  const source = item.source === "live_class" ? "live_class" : "webinar";
  const meta = sourceMeta[source];
  const Icon = meta.icon;
  const videoOptions = listVideoFiles(item.files ?? []);
  const [selectedVideoKey, setSelectedVideoKey] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const best = videoOptions[0];
    const key = best?.id ?? best?.recording_type ?? "0";
    setSelectedVideoKey(key);
  }, [item.id, item.uuid, videoOptions.length]);

  const selectedVideo =
    videoOptions.find((f) => (f.id ?? f.recording_type) === selectedVideoKey) ?? videoOptions[0] ?? null;

  const audio = pickAudio(item.files ?? []);
  const streamUrl = selectedVideo?.download_url ? getRecordingStreamUrl(selectedVideo.download_url) : null;
  const downloadUrl = selectedVideo?.download_url ? getRecordingDownloadUrl(selectedVideo.download_url) : null;
  const audioStreamUrl = audio?.download_url ? getRecordingStreamUrl(audio.download_url) : null;
  const isActiveSpeaker = (selectedVideo?.recording_type ?? "").toLowerCase().includes("active_speaker");

  const handleDelete = async () => {
    const sessionUuid = item.uuid != null ? String(item.uuid).trim() : "";
    const pathId = item.id ?? item.uuid;
    if (!pathId) {
      toast({ variant: "destructive", title: "Cannot delete", description: "Missing meeting identifier." });
      return;
    }

    setDeleting(true);
    try {
      const res = await deleteZoomCloudRecording(pathId, {
        uuid: sessionUuid || undefined,
        startTime: item.start_time ?? undefined,
      });
      toast({ title: "Deleted", description: res.message || "Recording removed from Zoom cloud." });
      onDeleted(item);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error?.response?.data?.message || "Unable to delete recording from Zoom cloud.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className={`overflow-hidden shadow-sm transition hover:shadow-md ${meta.cardClass}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={meta.badgeClass}>
                <Icon className="h-3.5 w-3.5 mr-1" />
                {meta.label}
              </Badge>
              {item.duration ? (
                <Badge variant="outline" className="bg-white/70">
                  <Clock3 className="h-3 w-3 mr-1" />
                  {item.duration} min
                </Badge>
              ) : null}
              {item.course_title ? (
                <Badge variant="outline" className="bg-white/70">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {item.course_title}
                </Badge>
              ) : null}
              {item.instructor_name ? (
                <Badge variant="outline" className="bg-white/70">
                  <UserRound className="h-3 w-3 mr-1" />
                  {item.instructor_name}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-lg leading-snug">{item.topic || "Recorded session"}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatWhen(item.start_time)}
              </span>
              {item.id ? <span className="text-xs">Meeting #{item.id}</span> : null}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {videoOptions.length > 1 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-white/70 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MonitorPlay className={`h-4 w-4 ${meta.accent}`} />
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
            Active speaker view is often a black screen when cameras were off. Switch to{" "}
            <strong>Screen + speakers</strong> or <strong>Screen share</strong> to see slides and participants.
          </p>
        )}

        {streamUrl ? (
          <div
            ref={mediaRef}
            className="overflow-hidden rounded-xl border bg-black shadow-inner min-h-[220px] flex items-center justify-center"
          >
            {inView ? (
              <video
                key={`${streamUrl}-${selectedVideoKey}`}
                src={streamUrl}
                controls
                playsInline
                preload="none"
                crossOrigin="anonymous"
                className="w-full max-h-[420px] bg-black"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-white/70">
                <PlayCircle className="h-10 w-10" />
                <span className="text-xs">Scroll to load preview</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground bg-white/60">
            Video file is still processing or unavailable.
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
                Download video
              </a>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                Delete from cloud
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete cloud recording?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all recording files for &quot;{item.topic || "this session"}&quot; from Zoom
                  cloud storage. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  {deleting ? "Deleting..." : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {audioStreamUrl && inView && (
          <div className="rounded-lg border bg-white/70 p-3 space-y-2">
            <p className={`text-xs font-medium inline-flex items-center gap-1 ${meta.accent}`}>
              <Mic2 className="h-3.5 w-3.5" />
              Audio-only track
            </p>
            <audio controls preload="none" crossOrigin="anonymous" className="w-full">
              <source src={audioStreamUrl} />
            </audio>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordingsSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border overflow-hidden animate-pulse bg-white">
          <div className="h-28 bg-gradient-to-r from-slate-100 to-slate-50" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="aspect-video bg-muted rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

const RecordedMeetings = () => {
  const { toast } = useToast();
  const [itemsLoading, setItemsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meetings, setMeetings] = useState<ZoomRecordingItem[]>([]);
  const [zoomConfigured, setZoomConfigured] = useState(true);
  const [scopeHint, setScopeHint] = useState<string | null>(null);
  const [zoomErrors, setZoomErrors] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [tab, setTab] = useState<SourceFilter>("all");
  const [instructorFilter, setInstructorFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const loadRecordings = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setItemsLoading(true);
    }
    try {
      const data = await getZoomRecordings({ refresh });
      const list = Array.isArray(data.recordings) ? data.recordings : [];
      setMeetings(list.filter((item) => item.source === "webinar" || item.source === "live_class"));
      setZoomConfigured(data.zoom_api_configured !== false);
      setScopeHint(data.scope_hint ?? null);
      setZoomErrors(Array.isArray(data.zoom_errors) ? data.zoom_errors : []);
      setFromCache(Boolean(data.cached));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to load Zoom recordings.",
        duration: 5000,
      });
      setMeetings([]);
    } finally {
      setItemsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRecordings(false);
  }, []);

  const handleRecordingDeleted = (deletedItem: ZoomRecordingItem) => {
    setMeetings((prev) => prev.filter((item) => !isSameRecordingSession(item, deletedItem)));
  };

  const instructorOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of meetings) {
      if (item.instructor_id && item.instructor_name) {
        map.set(item.instructor_id, item.instructor_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [meetings]);

  const courseOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of meetings) {
      if (item.course_id && item.course_title) {
        map.set(item.course_id, item.course_title);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [meetings]);

  const filtered = useMemo(() => {
    let list = meetings;
    if (tab !== "all") {
      list = list.filter((item) => item.source === tab);
    }
    if (instructorFilter !== "all") {
      list = list.filter((item) => String(item.instructor_id ?? "") === instructorFilter);
    }
    if (courseFilter !== "all") {
      list = list.filter((item) => String(item.course_id ?? "") === courseFilter);
    }
    return list;
  }, [meetings, tab, instructorFilter, courseFilter]);

  const counts = useMemo(
    () => ({
      webinar: meetings.filter((m) => m.source === "webinar").length,
      live_class: meetings.filter((m) => m.source === "live_class").length,
    }),
    [meetings]
  );

  const emptyState = (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center space-y-3">
      <PlayCircle className="h-10 w-10 mx-auto text-muted-foreground/70" />
      <p className="font-medium">No recordings in this category yet</p>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto">
        Pathways webinar and live class cloud recordings appear here after the session ends and Zoom
        finishes processing.
      </p>
      {scopeHint && (
        <div className="mx-auto max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-950">
          {scopeHint}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
              <Video className="h-3.5 w-3.5" />
              Cloud recordings library
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Recorded Meetings</h1>
            <p className="text-sm text-white/75 max-w-2xl">
              Watch Pathways webinar sessions and paid live class recordings. Unrelated Zoom meetings
              are hidden from this view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs items-center">
            <Badge className="bg-violet-500/90 hover:bg-violet-500/90">{counts.webinar} Pathways</Badge>
            <Badge className="bg-sky-500/90 hover:bg-sky-500/90">{counts.live_class} Live classes</Badge>
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto bg-white/10 text-white hover:bg-white/20 border-0"
              disabled={itemsLoading || refreshing}
              onClick={() => loadRecordings(true)}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SourceFilter)} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="all">All ({meetings.length})</TabsTrigger>
            <TabsTrigger value="webinar">Pathways ({counts.webinar})</TabsTrigger>
            <TabsTrigger value="live_class">Live Class ({counts.live_class})</TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Select value={instructorFilter} onValueChange={setInstructorFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All instructors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All instructors</SelectItem>
                {instructorOptions.map((opt) => (
                  <SelectItem key={opt.id} value={String(opt.id)}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courseOptions.map((opt) => (
                  <SelectItem key={opt.id} value={String(opt.id)}>
                    {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {itemsLoading ? (
          <RecordingsSkeleton />
        ) : !zoomConfigured ? (
          <p className="text-sm text-muted-foreground">
            Zoom API credentials are missing on the server. Configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID,
            and ZOOM_CLIENT_SECRET.
          </p>
        ) : (
          <div className="mt-0 space-y-3">
            {fromCache && (
              <p className="text-xs text-muted-foreground">
                Showing cached recordings (refreshes every 15 minutes). Click Refresh for the latest from Zoom.
              </p>
            )}
            {filtered.length ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {filtered.map((item) => (
                  <RecordingCard
                    key={String(item.uuid ?? item.id ?? item.topic)}
                    item={item}
                    onDeleted={handleRecordingDeleted}
                  />
                ))}
              </div>
            ) : (
              emptyState
            )}
          </div>
        )}
      </Tabs>

      {zoomErrors.length > 0 && !itemsLoading && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Zoom API details</summary>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {zoomErrors.slice(0, 4).map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default RecordedMeetings;
