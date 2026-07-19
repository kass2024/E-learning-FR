import type { LearnerRecordingFile } from "@/api/axios";

export function recordingViewScore(file: LearnerRecordingFile): number {
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

export function listVideoFiles(files: LearnerRecordingFile[]): LearnerRecordingFile[] {
  return [...files]
    .filter((f) => f.file_type === "MP4" && (f.download_url || f.play_url))
    .sort((a, b) => recordingViewScore(b) - recordingViewScore(a));
}

export function videoLabel(file: LearnerRecordingFile): string {
  return (file as { view_label?: string | null }).view_label || file.recording_type || "Video";
}

export function pickAudio(files: LearnerRecordingFile[]): LearnerRecordingFile | null {
  return files.find((f) => f.file_type === "M4A" || f.file_type === "MP3") ?? null;
}

export function formatRecordingWhen(value?: string | null) {
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
