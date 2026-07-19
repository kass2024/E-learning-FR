import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";

import { useToast } from "@/components/ui/use-toast";

import { getCourses, getStudentCourseEnrollments, enrollInCourse } from "@/api/axios";

import { fetchDashboardCached } from "@/lib/dashboardCache";

import { getStudentId } from "@/lib/dashboardUser";

import {

  buildEnrollmentStatusMap,

  getEnrollmentStatusForCourse,

  hasCourseAccess,

  isPendingEnrollmentApproval,

} from "@/lib/enrollmentStatus";

import { openCourseMaterials } from "@/lib/learnerNavigation";

import { LearnerMyCoursesSplitLayout } from "@/components/courses/LearnerMyCoursesSplitLayout";

import { ChevronRight, Loader2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";



const LearnerMyCourses = () => {

  const { toast } = useToast();

  const navigate = useNavigate();

  const [courses, setCourses] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  const [courseStatuses, setCourseStatuses] = useState<Record<number, string>>({});

  const [busyCourseId, setBusyCourseId] = useState<number | null>(null);

  const [tab, setTab] = useState<"all" | "enrolled" | "available">("all");



  const loadData = async () => {

    setLoading(true);

    try {

      const { data } = await fetchDashboardCached("courses-list", getCourses);

      const list = Array.isArray(data) ? data : [];

      setCourses(list);



      const studentIdNum = getStudentId();

      if (studentIdNum) {

        const res = await getStudentCourseEnrollments(studentIdNum);

        setCourseStatuses(buildEnrollmentStatusMap(res.enrollments));

      }

    } catch (error: any) {

      toast({

        variant: "destructive" as any,

        title: "Error",

        description: error?.response?.data?.message || "Unable to load your courses.",

      });

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    loadData();

  }, []);



  const enrolledCourses = useMemo(

    () => courses.filter((c) => Boolean(getEnrollmentStatusForCourse(courseStatuses, c.id))),

    [courses, courseStatuses]

  );



  const availableCourses = useMemo(

    () => courses.filter((c) => !getEnrollmentStatusForCourse(courseStatuses, c.id)),

    [courses, courseStatuses]

  );



  const defaultCourseId = useMemo(() => {

    const active = enrolledCourses.find((c) => {

      const s = getEnrollmentStatusForCourse(courseStatuses, c.id);

      return hasCourseAccess(s) || isPendingEnrollmentApproval(s);

    });

    return active?.id ?? enrolledCourses[0]?.id ?? courses[0]?.id ?? null;

  }, [enrolledCourses, courseStatuses, courses]);



  const handleApply = async (courseId: number, studyShiftIds: number[] = []) => {

    const studentId = Number(localStorage.getItem("parrot_student_id"));

    if (!studentId || Number.isNaN(studentId)) {

      toast({

        variant: "destructive" as any,

        title: "Not logged in",

        description: "Please log in with your learner account.",

      });

      return;

    }



    setBusyCourseId(courseId);

    try {

      const result = await enrollInCourse(courseId, studentId, undefined, studyShiftIds);

      const alreadyApplied = result?.message?.toLowerCase().includes("already");

      const appliedStatus = result?.enrollment?.status || "enrolled";



      setCourseStatuses((prev) => ({ ...prev, [courseId]: appliedStatus }));

      await loadData();



      toast({

        variant: "success" as any,

        title: alreadyApplied ? "Application on file" : "Application submitted",

        description: alreadyApplied

          ? "Your application is waiting for approval."

          : "You can view the course guide while your application is reviewed.",

        duration: 5000,

      });

    } catch (error: any) {

      toast({

        variant: "destructive" as any,

        title: "Error",

        description: error?.response?.data?.message || "Failed to apply for this course.",

      });

    } finally {

      setBusyCourseId(null);

    }

  };



  const goToPayment = (courseId: number) => {

    localStorage.setItem("parrot_selected_course_id", String(courseId));

    navigate("/dashboard/learner/payment");

  };



  const layoutProps = {

    courseStatuses,

    busyCourseId,

    onApply: handleApply,

    onOpenCourse: (id: number) => openCourseMaterials(navigate, id, "overview"),

    onPay: goToPayment,

    defaultCourseId,

  };



  return (

    <div className="space-y-5">

      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">

        <button type="button" onClick={() => navigate("/dashboard/learner")} className="hover:text-foreground">

          Dashboard

        </button>

        <ChevronRight className="h-3.5 w-3.5" />

        <span className="text-foreground font-medium">My courses</span>

      </nav>



      <div className="border-b border-slate-200 pb-4">

        <h1 className="text-2xl sm:text-3xl font-normal text-slate-900">My courses</h1>

        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">

          Each course is listed separately on the left — select one to view details, apply, or open the course guide.

        </p>

      </div>



      {loading ? (

        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">

          <Loader2 className="h-5 w-5 animate-spin" />

          Loading courses...

        </div>

      ) : (

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">

          <div className="px-4 py-3 bg-[#f8f9fa] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Course catalog</p>

            <div className="flex gap-2">

              <Badge variant="outline" className="font-mono text-[10px]">

                {enrolledCourses.length} enrolled

              </Badge>

              <Badge variant="secondary" className="text-[10px]">

                {availableCourses.length} available

              </Badge>

            </div>

          </div>



          <div className="p-4 sm:p-5">

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>

              <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-slate-100 p-1">

                <TabsTrigger value="all" className="text-xs sm:text-sm">

                  All courses ({courses.length})

                </TabsTrigger>

                <TabsTrigger value="enrolled" className="text-xs sm:text-sm">

                  My enrollments ({enrolledCourses.length})

                </TabsTrigger>

                <TabsTrigger value="available" className="text-xs sm:text-sm">

                  Apply ({availableCourses.length})

                </TabsTrigger>

              </TabsList>



              <TabsContent value="all" className="mt-0">

                <LearnerMyCoursesSplitLayout {...layoutProps} courses={courses} />

              </TabsContent>



              <TabsContent value="enrolled" className="mt-0">

                <LearnerMyCoursesSplitLayout

                  {...layoutProps}

                  courses={enrolledCourses}

                  showOnlyEnrolled

                />

              </TabsContent>



              <TabsContent value="available" className="mt-0">

                <LearnerMyCoursesSplitLayout {...layoutProps} courses={availableCourses} defaultCourseId={availableCourses[0]?.id ?? null} />

              </TabsContent>

            </Tabs>

          </div>

        </div>

      )}

    </div>

  );

};



export default LearnerMyCourses;

