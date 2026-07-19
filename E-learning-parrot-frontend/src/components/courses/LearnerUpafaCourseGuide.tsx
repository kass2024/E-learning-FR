import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DEFAULT_GUIDELINES } from "@/lib/courseDetails";
import type { CourseDetailsFields } from "@/lib/courseDetails";
import { LearnerUpafaCourseNav, UpafaAnnouncementsLink, type UpafaNavSection } from "./LearnerUpafaCourseNav";

type CourseData = CourseDetailsFields & {
  title?: string;
  description?: string | null;
  requirements?: string | null;
  duration?: string | null;
  price?: number | null;
};

type Props = {
  course: CourseData;
  activeSection: string;
  onSelectSection: (id: string) => void;
  scrollToSection?: (id: string) => void;
};

function RichBlock({ text }: { text?: string | null }) {
  if (!text?.trim()) return null;
  return <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{text}</div>;
}

export function buildUpafaNavSections(course: CourseData, hasMaterialsAccess: boolean): UpafaNavSection[] {
  const sections: UpafaNavSection[] = [
    { id: "general", label: "General" },
    { id: "general-information", label: "General information" },
    { id: "important-information", label: "Important information" },
  ];
  if (course.attendance_policy?.trim()) {
    sections.push({ id: "attendance", label: "Attendance policy" });
  }
  if (course.assessment_policy?.trim()) {
    sections.push({ id: "assessment", label: "Assessment" });
  }
  if (hasMaterialsAccess) {
    sections.push({
      id: "materials",
      label: "Course materials",
      children: [
        { id: "files", label: "Course files" },
        { id: "videos", label: "Videos" },
        { id: "documents", label: "Resources" },
        { id: "quizzes", label: "Quizzes" },
        { id: "live", label: "Live classes" },
        { id: "recordings", label: "Recordings" },
      ],
    });
  } else {
    sections.push({ id: "materials", label: "Course materials" });
  }
  return sections;
}

export function LearnerUpafaCourseGuide({
  course,
  activeSection,
  onSelectSection,
}: Props) {
  const guidelines = course.guidelines?.length ? course.guidelines : DEFAULT_GUIDELINES;
  const howToUse = course.how_to_use ?? [];

  const sectionIds = useMemo(() => {
    const ids = ["general", "general-information", "important-information"];
    if (course.attendance_policy?.trim()) ids.push("attendance");
    if (course.assessment_policy?.trim()) ids.push("assessment");
    return ids;
  }, [course.attendance_policy, course.assessment_policy]);

  const [openSections, setOpenSections] = useState<string[]>(sectionIds);

  const collapseAll = () => setOpenSections([]);
  const expandAll = () => setOpenSections([...sectionIds]);

  const jumpTo = (id: string) => {
    setOpenSections((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onSelectSection(id);
    requestAnimationFrame(() => {
      document.getElementById(`upafa-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <h1 className="text-2xl sm:text-3xl font-normal text-slate-900">{course.title ?? "Course"}</h1>
        <div className="flex gap-3 text-sm text-[#0f6cbf] shrink-0">
          <button type="button" className="hover:underline" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" className="hover:underline" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="border border-slate-200 rounded-sm overflow-hidden bg-white shadow-sm"
      >
        <AccordionItem value="general" id="upafa-section-general" className="border-b border-slate-200">
          <AccordionTrigger className="hover:no-underline px-4 py-3 bg-[#f8f9fa] text-[#0f6cbf] text-base font-normal [&[data-state=open]]:border-b [&[data-state=open]]:border-slate-200">
            General
          </AccordionTrigger>
          <AccordionContent className="px-4 py-4 bg-white">
            <div id="course-announcements">
              <UpafaAnnouncementsLink />
              <p className="text-xs text-muted-foreground mt-3">
                Important updates about schedules, deadlines, and exams are posted in announcements.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="general-information" id="upafa-section-general-information" className="border-b border-slate-200">
          <AccordionTrigger className="hover:no-underline px-4 py-3 bg-[#f8f9fa] text-[#0f6cbf] text-base font-normal">
            General information
          </AccordionTrigger>
          <AccordionContent className="px-4 py-5 bg-white">
            <RichBlock
              text={
                course.general_information ||
                course.description ||
                "Welcome to this course. Your instructor will add a full course guide here. Use the navigation menu on the left to move between sections."
              }
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="important-information" id="upafa-section-important-information" className="border-b border-slate-200">
          <AccordionTrigger className="hover:no-underline px-4 py-3 bg-[#f8f9fa] text-[#0f6cbf] text-base font-normal">
            Important information
          </AccordionTrigger>
          <AccordionContent className="px-4 py-5 bg-white space-y-5">
            {course.important_information && <RichBlock text={course.important_information} />}
            {course.requirements && (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Requirements</p>
                <RichBlock text={course.requirements} />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-2">Guidelines</p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-800">
                {guidelines.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
            {howToUse.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">How to use</p>
                <div className="space-y-4">
                  {howToUse.map((item, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-[#0f6cbf] mb-1">{item.title}</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#0f6cbf] mt-4 italic">
                  Note: Please check your email regularly for additional communications from your instructor.
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {course.attendance_policy?.trim() && (
          <AccordionItem value="attendance" id="upafa-section-attendance" className="border-b border-slate-200">
            <AccordionTrigger className="hover:no-underline px-4 py-3 bg-[#f8f9fa] text-[#0f6cbf] text-base font-normal">
              Attendance policy
            </AccordionTrigger>
            <AccordionContent className="px-4 py-5 bg-white">
              <RichBlock text={course.attendance_policy} />
            </AccordionContent>
          </AccordionItem>
        )}

        {course.assessment_policy?.trim() && (
          <AccordionItem value="assessment" id="upafa-section-assessment" className="border-b-0">
            <AccordionTrigger className="hover:no-underline px-4 py-3 bg-[#f8f9fa] text-[#0f6cbf] text-base font-normal">
              Assessment
            </AccordionTrigger>
            <AccordionContent className="px-4 py-5 bg-white">
              <RichBlock text={course.assessment_policy} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Hidden quick-jump hooks for sidebar */}
      <div className="sr-only">
        {sectionIds.map((id) => (
          <button key={id} type="button" onClick={() => jumpTo(id)}>
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}

export { LearnerUpafaCourseNav };
