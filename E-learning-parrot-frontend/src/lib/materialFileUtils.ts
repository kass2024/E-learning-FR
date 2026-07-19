import { getApiBaseUrl } from "@/lib/apiConfig";
import type { LearnerCourseMaterial } from "@/api/axios";
import type { MaterialPreviewItem } from "@/components/materials/MaterialPreviewDialog";

export type MaterialFileCategory = "images" | "videos" | "audio" | "documents";

export function detectMaterialCategory(name: string): MaterialFileCategory {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "images";
  if (["mp4", "mov", "avi", "webm", "mkv", "wmv", "flv", "m4v"].includes(ext)) return "videos";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"].includes(ext)) return "audio";
  return "documents";
}

export function formatMaterialBytes(bytes?: number | null): string {
  const n = typeof bytes === "number" ? bytes : 0;
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let val = n;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function isFileMaterial(m: LearnerCourseMaterial): boolean {
  if (["zoom", "quiz", "assessment", "lesson"].includes(m.kind)) return false;
  return m.storage === "pcloud" || Boolean(m.resource_url);
}

export function getMaterialStreamUrl(
  courseId: number,
  materialId: number,
  mode: "download" | "preview" | "thumb" | "video" = "download",
  studentId?: number
) {
  const params = new URLSearchParams({ mode });
  if (studentId) params.set("student_id", String(studentId));
  return `${getApiBaseUrl()}/courses/${courseId}/materials/${materialId}/stream?${params.toString()}`;
}

export function materialFileCategory(m: LearnerCourseMaterial): MaterialFileCategory {
  if (m.file_category) return m.file_category as MaterialFileCategory;
  return detectMaterialCategory(m.filename ?? m.title);
}

export function isPdfFilename(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext === "pdf";
}

export function buildMaterialPreviewItem(
  material: LearnerCourseMaterial,
  courseId: number,
  studentId?: number
): MaterialPreviewItem | null {
  const category = materialFileCategory(material);
  const name = material.filename ?? material.title;

  if (material.storage === "pcloud" && material.id) {
    const previewMode =
      category === "videos"
        ? "video"
        : category === "images"
          ? "thumb"
          : category === "audio"
            ? "preview"
            : "preview";

    return {
      name,
      category,
      previewUrl: getMaterialStreamUrl(courseId, material.id, previewMode, studentId),
      downloadUrl: getMaterialStreamUrl(courseId, material.id, "download", studentId),
      thumbUrl: getMaterialStreamUrl(courseId, material.id, "thumb", studentId),
    };
  }

  if (material.resource_url) {
    return {
      name,
      category,
      previewUrl: material.resource_url,
      downloadUrl: material.resource_url,
    };
  }

  return null;
}

export function categoryLabel(category: MaterialFileCategory): string {
  return (
    {
      images: "Image",
      videos: "Video",
      audio: "Audio",
      documents: "Document",
    }[category] ?? "File"
  );
}
