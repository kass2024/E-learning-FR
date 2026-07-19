import { useState } from "react";
import { ChevronDown, ChevronRight, Home, LayoutDashboard, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type UpafaNavCourse = {
  id: number;
  title?: string | null;
  course_code?: string | null;
  status?: string;
};

export type UpafaNavSection =
  | { id: "guide"; label: string }
  | { id: "general"; label: string }
  | { id: "general-information"; label: string }
  | { id: "important-information"; label: string }
  | { id: "attendance"; label: string }
  | { id: "assessment"; label: string }
  | { id: "materials"; label: string; children?: Array<{ id: string; label: string }> };

type Props = {
  courses: UpafaNavCourse[];
  selectedCourseId: number | null;
  onSelectCourse: (courseId: number) => void;
  sections: UpafaNavSection[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  onNavigateDashboard: () => void;
  onNavigateMyCourses: () => void;
};

export function LearnerUpafaCourseNav({
  courses,
  selectedCourseId,
  onSelectCourse,
  sections,
  activeSection,
  onSelectSection,
  onNavigateDashboard,
  onNavigateMyCourses,
}: Props) {
  const [coursesOpen, setCoursesOpen] = useState(true);
  const [courseTreeOpen, setCourseTreeOpen] = useState(true);
  const [materialsOpen, setMaterialsOpen] = useState(true);

  const selected = courses.find((c) => c.id === selectedCourseId);
  const code = selected?.course_code || (selected ? `Course ${selected.id}` : "");

  return (
    <aside className="rounded-lg border border-slate-200 bg-[#f8f9fa] text-sm shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-200 bg-white">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Navigation</p>
      </div>

      <nav className="p-2 space-y-0.5 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <button
          type="button"
          onClick={onNavigateDashboard}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-slate-700 hover:bg-white hover:text-[#0f6cbf]"
        >
          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={onNavigateMyCourses}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-slate-700 hover:bg-white hover:text-[#0f6cbf]"
        >
          <Home className="h-3.5 w-3.5 shrink-0" />
          All my courses
        </button>

        {courses.length > 1 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setCoursesOpen((v) => !v)}
              className="w-full flex items-center gap-1 px-2 py-1.5 font-medium text-slate-800 hover:bg-white rounded"
            >
              {coursesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Switch course
            </button>
            {coursesOpen && (
              <div className="ml-3 border-l border-slate-300 pl-2 mt-0.5 space-y-0.5">
                {courses.map((course) => {
                  const label = course.course_code || course.title || `Course ${course.id}`;
                  const isActive = course.id === selectedCourseId;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => onSelectCourse(course.id)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded text-xs truncate",
                        isActive ? "bg-[#0f6cbf]/10 text-[#0f6cbf] font-semibold" : "text-slate-600 hover:bg-white hover:text-[#0f6cbf]"
                      )}
                      title={course.title ?? label}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedCourseId && (
          <div className="pt-2 mt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCourseTreeOpen((v) => !v)}
              className="w-full flex items-center gap-1 px-2 py-1.5 font-semibold text-[#0f6cbf] hover:bg-white rounded"
            >
              {courseTreeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {code}
            </button>
            {courseTreeOpen && (
              <div className="ml-3 border-l border-slate-300 pl-2 mt-0.5 space-y-0.5">
                {sections.map((section) => {
                  if (section.id === "materials" && section.children?.length) {
                    return (
                      <div key={section.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMaterialsOpen((v) => !v);
                            onSelectSection("materials");
                          }}
                          className={cn(
                            "w-full flex items-center gap-1 px-2 py-1 rounded text-left text-xs",
                            activeSection.startsWith("materials") || activeSection === "files" || activeSection === "videos"
                              ? "text-[#0f6cbf] font-medium"
                              : "text-slate-600 hover:bg-white hover:text-[#0f6cbf]"
                          )}
                        >
                          {materialsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {section.label}
                        </button>
                        {materialsOpen && (
                          <div className="ml-3 space-y-0.5 py-0.5">
                            {section.children.map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => onSelectSection(child.id)}
                                className={cn(
                                  "w-full text-left px-2 py-1 rounded text-xs",
                                  activeSection === child.id
                                    ? "bg-[#0f6cbf]/10 text-[#0f6cbf] font-medium"
                                    : "text-slate-600 hover:bg-white hover:text-[#0f6cbf]"
                                )}
                              >
                                {child.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSelectSection(section.id)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded text-xs",
                        activeSection === section.id
                          ? "bg-[#0f6cbf]/10 text-[#0f6cbf] font-medium"
                          : "text-slate-600 hover:bg-white hover:text-[#0f6cbf]"
                      )}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

export function UpafaAnnouncementsLink() {
  return (
    <a
      href="#course-announcements"
      className="inline-flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f6cbf] hover:bg-slate-50 hover:underline"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white shrink-0">
        <Megaphone className="h-4 w-4" />
      </span>
      Announcements
    </a>
  );
}
