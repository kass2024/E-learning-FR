export function openCourseMaterials(
  navigate: (path: string) => void,
  courseId: number,
  tab?: "overview" | "videos" | "files" | "recordings"
) {
  if (typeof window !== "undefined") {
    localStorage.setItem("parrot_selected_course_id", String(courseId));
  }
  const tabQuery = tab ? `&tab=${tab}` : "";
  navigate(`/dashboard/learner/materials?courseId=${courseId}${tabQuery}`);
}

export function formatClassTime(iso?: string | null): string {
  if (!iso) return "Schedule TBA";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
