export type HowToUseItem = { title: string; description?: string };

export type CourseDetailsFields = {
  course_code?: string;
  general_information?: string;
  important_information?: string;
  guidelines?: string[];
  how_to_use?: HowToUseItem[];
  attendance_policy?: string;
  assessment_policy?: string;
};

export const CODE_PREFIX_OPTIONS = ["ENG", "FRE", "BBA", "IELTS", "BUS", "GEN"] as const;

export const DEFAULT_HOW_TO_USE: HowToUseItem[] = [
  {
    title: "Announcements",
    description: "Important updates about schedules, deadlines, and exams are posted here.",
  },
  {
    title: "Reminders",
    description: "Friendly reminders for upcoming classes and assignments to help you stay on track.",
  },
  {
    title: "Feedback",
    description: "Share suggestions about course materials, structure, or your learning experience.",
  },
];

export const DEFAULT_GUIDELINES = [
  "Stay Updated: Check announcements regularly for important updates.",
  "Respectful Communication: Maintain a courteous and professional tone.",
  "Relevant Content: Keep discussions focused on course topics.",
  "Engagement: Ask questions and participate actively in sessions.",
  "Timely Responses: Instructors respond as soon as possible during business hours.",
];

export function guidelinesToText(items?: string[]): string {
  return (items ?? []).join("\n");
}

export function textToGuidelines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeHowToUse(items?: HowToUseItem[]): HowToUseItem[] {
  return (items ?? [])
    .map((item) => ({
      title: item.title?.trim() ?? "",
      description: item.description?.trim() ?? "",
    }))
    .filter((item) => item.title);
}

export function appendCourseDetailsToFormData(form: FormData, details: CourseDetailsFields) {
  if (details.course_code) form.append("course_code", details.course_code);
  if (details.general_information) form.append("general_information", details.general_information);
  if (details.important_information) form.append("important_information", details.important_information);
  if (details.attendance_policy) form.append("attendance_policy", details.attendance_policy);
  if (details.assessment_policy) form.append("assessment_policy", details.assessment_policy);
  form.append("guidelines", JSON.stringify(details.guidelines ?? []));
  form.append("how_to_use", JSON.stringify(normalizeHowToUse(details.how_to_use)));
}

export function courseDetailsFromCourse(course: Partial<CourseDetailsFields> | null | undefined): CourseDetailsFields {
  return {
    course_code: course?.course_code ?? "",
    general_information: course?.general_information ?? "",
    important_information: course?.important_information ?? "",
    guidelines: course?.guidelines ?? [],
    how_to_use: normalizeHowToUse(course?.how_to_use?.length ? course.how_to_use : DEFAULT_HOW_TO_USE),
    attendance_policy: course?.attendance_policy ?? "",
    assessment_policy: course?.assessment_policy ?? "",
  };
}
