import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Bell,
  ChevronRight,
  ClipboardList,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import type { CourseDetailsFields } from "@/lib/courseDetails";

type LearnerCourseOverviewProps = {
  course: CourseDetailsFields & {
    title?: string;
    description?: string | null;
    requirements?: string | null;
    duration?: string | null;
    price?: number | null;
  };
  /** Moodle/UPAFA-style section quick links in the sidebar */
  showSectionNav?: boolean;
  onSectionSelect?: (sectionId: string) => void;
};

const SECTIONS = [
  { id: "general", label: "General information" },
  { id: "important", label: "Important information" },
  { id: "howto", label: "How to use" },
  { id: "attendance", label: "Attendance policy" },
  { id: "assessment", label: "Assessment policy" },
] as const;

function RichBlock({ text }: { text?: string | null }) {
  if (!text?.trim()) return null;
  return <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</div>;
}

export function LearnerCourseOverview({
  course,
  showSectionNav = false,
  onSectionSelect,
}: LearnerCourseOverviewProps) {
  const guidelines = course.guidelines ?? [];
  const howToUse = course.how_to_use ?? [];
  const defaultOpen = ["general", "important", "howto", "attendance", "assessment"].filter((id) => {
    if (id === "howto") return howToUse.length > 0;
    if (id === "attendance") return Boolean(course.attendance_policy);
    if (id === "assessment") return Boolean(course.assessment_policy);
    return true;
  });
  const [openSections, setOpenSections] = useState<string[]>(defaultOpen);

  const collapseAll = () => setOpenSections([]);
  const expandAll = () => setOpenSections([...defaultOpen]);

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === "howto") return howToUse.length > 0;
    if (s.id === "attendance") return Boolean(course.attendance_policy);
    if (s.id === "assessment") return Boolean(course.assessment_policy);
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {showSectionNav && (
        <nav className="lg:w-52 shrink-0 space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-2">
            Course sections
          </p>
          {visibleSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                setOpenSections((prev) => (prev.includes(section.id) ? prev : [...prev, section.id]));
                onSectionSelect?.(section.id);
                document.getElementById(`course-section-${section.id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-slate-700 hover:bg-slate-100 hover:text-[#0070D0]"
            >
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {section.label}
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{course.title ?? "Course"}</h1>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{course.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {course.course_code && (
              <Badge variant="outline" className="font-mono text-sm">
                {course.course_code}
              </Badge>
            )}
            {course.duration && <Badge variant="secondary">{course.duration}</Badge>}
          </div>
        </div>

        <div className="flex justify-end gap-2 text-xs">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[#0070D0]" onClick={expandAll}>
            Expand all
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-[#0070D0]" onClick={collapseAll}>
            Collapse all
          </Button>
        </div>

        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-0 border rounded-lg overflow-hidden bg-white"
        >
          <AccordionItem value="general" id="course-section-general" className="border-b last:border-b-0">
            <AccordionTrigger className="hover:no-underline px-4 py-3 bg-slate-100/90 text-[#0070D0] font-semibold">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                General information
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-4 bg-white">
              <RichBlock text={course.general_information || course.description} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="important" id="course-section-important" className="border-b last:border-b-0">
            <AccordionTrigger className="hover:no-underline px-4 py-3 bg-slate-100/90 text-[#0070D0] font-semibold">
              Important information
            </AccordionTrigger>
            <AccordionContent className="px-4 py-4 bg-white space-y-4">
              <RichBlock text={course.important_information} />
              {course.requirements && (
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs font-semibold text-amber-900 mb-1">Requirements</p>
                  <RichBlock text={course.requirements} />
                </div>
              )}
              {guidelines.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Guidelines
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                    {guidelines.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {howToUse.length > 0 && (
            <AccordionItem value="howto" id="course-section-howto" className="border-b last:border-b-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 bg-slate-100/90 text-[#0070D0] font-semibold">
                How to use
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white space-y-3">
                {howToUse.map((item, i) => (
                  <div key={i} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-1">
                      {item.title.toLowerCase().includes("announce") ? (
                        <Megaphone className="h-4 w-4 text-sky-600" />
                      ) : item.title.toLowerCase().includes("remind") ? (
                        <Bell className="h-4 w-4 text-amber-600" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-violet-600" />
                      )}
                      {item.title}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {course.attendance_policy && (
            <AccordionItem value="attendance" id="course-section-attendance" className="border-b last:border-b-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 bg-slate-100/90 text-[#0070D0] font-semibold">
                Attendance policy
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white">
                <RichBlock text={course.attendance_policy} />
              </AccordionContent>
            </AccordionItem>
          )}

          {course.assessment_policy && (
            <AccordionItem value="assessment" id="course-section-assessment" className="border-b last:border-b-0">
              <AccordionTrigger className="hover:no-underline px-4 py-3 bg-slate-100/90 text-[#0070D0] font-semibold">
                Assessment policy
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white">
                <RichBlock text={course.assessment_policy} />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}
