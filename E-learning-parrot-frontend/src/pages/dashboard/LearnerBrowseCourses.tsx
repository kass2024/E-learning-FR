import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getStudentCourseEnrollments, getCourses } from "@/api/axios";
import {
  buildEnrollmentStatusMap,
  getEnrollmentStatusForCourse,
} from "@/lib/enrollmentStatus";
import { openCourseMaterials } from "@/lib/learnerNavigation";
import { LearnerUpafaCourseCatalog } from "@/components/courses/LearnerUpafaCourseCatalog";
import { ChevronRight, Loader2 } from "lucide-react";

const LearnerBrowseCourses = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseStatuses, setCourseStatuses] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getCourses();
        const list = Array.isArray(data) ? data : [];
        let filtered: any[] = [];

        if (typeof window !== "undefined") {
          const storedStudentId = localStorage.getItem("parrot_student_id");
          const studentIdNum = storedStudentId ? Number(storedStudentId) : NaN;

          if (studentIdNum && !Number.isNaN(studentIdNum)) {
            const res = await getStudentCourseEnrollments(studentIdNum);
            const byCourse = buildEnrollmentStatusMap(res.enrollments);
            setCourseStatuses(byCourse);

            filtered = list.filter((c) => {
              if (!c?.id) return false;
              return Boolean(getEnrollmentStatusForCourse(byCourse, c.id));
            });
          }
        }

        setCourses(filtered);
      } catch (error: any) {
        toast({
          variant: "destructive" as any,
          title: "Error",
          description: error?.response?.data?.message || "Unable to load your courses.",
          duration: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const goToPayment = (courseId: number) => {
    localStorage.setItem("parrot_selected_course_id", String(courseId));
    navigate("/dashboard/learner/payment");
  };

  const defaultOpenIds = courses.length > 0 ? [String(courses[0].id)] : [];

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <button type="button" onClick={() => navigate("/dashboard/learner")} className="hover:text-foreground">
          Dashboard
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">My applied courses</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-900">My applied courses</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Courses you have applied for, listed by code and name. Expand any row to open the full course guide.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/learner")}>
          Back to dashboard
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        ) : (
          <LearnerUpafaCourseCatalog
            courses={courses}
            courseStatuses={courseStatuses}
            onOpenCourse={(id) => openCourseMaterials(navigate, id, "overview")}
            onPay={goToPayment}
            defaultOpenIds={defaultOpenIds}
            showOnlyEnrolled
          />
        )}
      </div>
    </div>
  );
};

export default LearnerBrowseCourses;
