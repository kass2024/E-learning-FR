import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { GraduationCap, Pencil, CheckCircle2, XCircle } from "lucide-react";

import {

  approveStudyShiftChangeRequest,

  getInstructorStudents,

  getStudyShiftChangeRequests,

  rejectStudyShiftChangeRequest,

  updateEnrollmentStudyShifts,

  type InstructorStudentRow,

  type StudyShiftChangeRequestRow,

} from "@/api/axios";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

import { useDashboardQuery } from "@/hooks/useDashboardQuery";

import { dashboardCacheKey, getInstructorEmail } from "@/lib/dashboardUser";

import { getAdminImpersonation } from "@/lib/adminImpersonation";

import { formatEnrollmentShiftsSummary } from "@/lib/studyShiftUtils";

import { TableSkeleton } from "@/components/admin/TableSkeleton";

import { EnrollmentShiftEditor } from "@/components/study-shifts/EnrollmentShiftEditor";
import { EnrollmentManageActions } from "@/components/enrollments/EnrollmentManageActions";
import { enrollmentPaymentStatusText, isPendingEnrollmentApproval } from "@/lib/enrollmentStatus";
import { rejectCourseEnrollment } from "@/api/axios";

import { useToast } from "@/components/ui/use-toast";

import { invalidateDashboardCache } from "@/lib/dashboardCache";



type StudyShiftOption = {

  id: number;

  course_id?: number | null;

  label?: string;

};



type StudentsPayload = {

  students: InstructorStudentRow[];

  courses: Array<{ id: number; title?: string }>;

  study_shifts?: StudyShiftOption[];

};



function getStaffEmail() {

  const imp = getAdminImpersonation();

  return imp?.adminEmail ?? getInstructorEmail() ?? undefined;

}



const InstructorStudents = () => {

  const { toast } = useToast();

  const email = getInstructorEmail() ?? "";

  const [search, setSearch] = useState("");

  const [courseFilter, setCourseFilter] = useState<string>("all");

  const [shiftFilter, setShiftFilter] = useState<string>("all");

  const [pendingRequests, setPendingRequests] = useState<StudyShiftChangeRequestRow[]>([]);

  const [loadingRequests, setLoadingRequests] = useState(false);

  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const [shiftEditor, setShiftEditor] = useState<{

    studentId: number;

    courseId: number;

    courseTitle?: string;

    studentName?: string;

    currentShifts: InstructorStudentRow["study_shifts"];

  } | null>(null);

  const [savingShifts, setSavingShifts] = useState(false);



  const { data, loading, reload } = useDashboardQuery<StudentsPayload>(

    dashboardCacheKey("instructor-students", email),

    () => getInstructorStudents(email),

    { enabled: !!email }

  );



  const loadPendingRequests = useCallback(async () => {

    setLoadingRequests(true);

    try {

      const result = await getStudyShiftChangeRequests({ status: "pending", email: getStaffEmail() });

      setPendingRequests(result.requests ?? []);

    } catch {

      setPendingRequests([]);

    } finally {

      setLoadingRequests(false);

    }

  }, []);



  useEffect(() => {

    if (email) loadPendingRequests();

  }, [email, loadPendingRequests]);



  const students = data?.students ?? [];
  const courses = data?.courses ?? [];
  const allShifts = data?.study_shifts ?? [];
  const staffEmail = getStaffEmail() ?? email;

  const pendingApplications = useMemo(
    () => students.filter((row) => isPendingEnrollmentApproval(row.status)),
    [students]
  );



  useEffect(() => {

    setShiftFilter("all");

  }, [courseFilter]);



  const shiftOptions = useMemo(() => {

    if (courseFilter === "all") return allShifts;

    return allShifts.filter((s) => String(s.course_id) === courseFilter);

  }, [allShifts, courseFilter]);



  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(

    () =>

      students.filter((row) => {

        if (courseFilter !== "all" && String(row.course_id) !== courseFilter) return false;

        if (shiftFilter !== "all") {

          const shiftId = Number(shiftFilter);

          if (!(row.study_shifts ?? []).some((s) => s.id === shiftId)) return false;

        }

        if (!normalizedSearch) return true;

        const shiftText = formatEnrollmentShiftsSummary(row.study_shifts ?? []);

        const haystack = [row.name, row.email, row.course_title, row.country, shiftText]

          .filter(Boolean)

          .join(" ")

          .toLowerCase();

        return haystack.includes(normalizedSearch);

      }),

    [students, courseFilter, shiftFilter, normalizedSearch]

  );



  const handleSaveShifts = async (shiftIds: number[]) => {

    if (!shiftEditor) return;

    setSavingShifts(true);

    try {

      await updateEnrollmentStudyShifts(

        shiftEditor.courseId,

        shiftEditor.studentId,

        shiftIds,

        getStaffEmail()

      );

      toast({ title: "Study shifts updated" });

      setShiftEditor(null);

      invalidateDashboardCache(dashboardCacheKey("instructor-students", email));

      await reload();

      await loadPendingRequests();

    } catch (error: any) {

      toast({

        variant: "destructive",

        title: "Could not update shifts",

        description: error?.response?.data?.message || "Please try again.",

      });

    } finally {

      setSavingShifts(false);

    }

  };



  const handleApproveRequest = async (requestId: number) => {

    setProcessingRequestId(requestId);

    try {

      await approveStudyShiftChangeRequest(requestId, getStaffEmail());

      toast({ title: "Shift change approved" });

      invalidateDashboardCache(dashboardCacheKey("instructor-students", email));

      await reload();

      await loadPendingRequests();

    } catch (error: any) {

      toast({

        variant: "destructive",

        title: "Approval failed",

        description: error?.response?.data?.message || "Please try again.",

      });

    } finally {

      setProcessingRequestId(null);

    }

  };



  const handleRejectRequest = async (requestId: number) => {

    setProcessingRequestId(requestId);

    try {

      await rejectStudyShiftChangeRequest(requestId, getStaffEmail());

      toast({ title: "Shift change rejected" });

      await loadPendingRequests();

    } catch (error: any) {

      toast({

        variant: "destructive",

        title: "Rejection failed",

        description: error?.response?.data?.message || "Please try again.",

      });

    } finally {

      setProcessingRequestId(null);

    }

  };



  return (

    <div className="space-y-6">

      <AdminPageHeader

        eyebrow="Instructor"

        title="Manage Students"

        description="Approve new applications, manage study shifts, and track payment status for your learners."
      />

      {pendingApplications.length > 0 && (
        <Card className="border-sky-200 bg-sky-50/40">
          <CardHeader>
            <CardTitle className="text-base">Pending course applications</CardTitle>
            <CardDescription>
              {pendingApplications.length} learner(s) waiting for your approval to access course materials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApplications.map((row) => (
              <div
                key={row.enrollment_id}
                className="rounded-lg border border-sky-100 bg-white p-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.course_title} · {row.email}
                  </p>
                  {(row.study_shifts ?? []).length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatEnrollmentShiftsSummary(row.study_shifts ?? [])}
                    </p>
                  )}
                </div>
                <EnrollmentManageActions
                  studentId={row.student_id}
                  courseId={row.course_id}
                  status={row.status ?? "enrolled"}
                  staffEmail={staffEmail}
                  onUpdated={async () => {
                    invalidateDashboardCache(dashboardCacheKey("instructor-students", email));
                    await reload();
                  }}
                  onReject={async () => {
                    const reason = window.prompt("Optional reason for rejection:");
                    if (reason === null) return;
                    await rejectCourseEnrollment(
                      row.course_id,
                      row.student_id,
                      reason || undefined,
                      staffEmail
                    );
                    invalidateDashboardCache(dashboardCacheKey("instructor-students", email));
                    await reload();
                    toast({ variant: "success" as any, title: "Enrollment rejected" });
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (

        <Card className="border-amber-200 bg-amber-50/40">

          <CardHeader>

            <CardTitle className="text-base">Pending shift change requests</CardTitle>

            <CardDescription>{pendingRequests.length} request(s) awaiting review</CardDescription>

          </CardHeader>

          <CardContent className="space-y-3">

            {loadingRequests ? (

              <p className="text-sm text-muted-foreground">Loading requests…</p>

            ) : (

              pendingRequests.map((req) => (

                <div key={req.id} className="rounded-lg border bg-white p-3 space-y-2">

                  <div className="flex flex-wrap items-start justify-between gap-2">

                    <div>

                      <p className="font-medium text-sm">{req.student_name}</p>

                      <p className="text-xs text-muted-foreground">{req.course_title}</p>

                    </div>

                    <Badge variant="outline">Pending</Badge>

                  </div>

                  <p className="text-xs text-muted-foreground">

                    From: {formatEnrollmentShiftsSummary(req.current_shifts ?? [])}

                  </p>

                  <p className="text-xs text-muted-foreground">

                    To: {formatEnrollmentShiftsSummary(req.requested_shifts ?? [])}

                  </p>

                  {req.reason && <p className="text-xs italic text-muted-foreground">"{req.reason}"</p>}

                  <div className="flex gap-2">

                    <Button

                      size="sm"

                      className="h-8"

                      disabled={processingRequestId === req.id}

                      onClick={() => handleApproveRequest(req.id)}

                    >

                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />

                      Approve

                    </Button>

                    <Button

                      size="sm"

                      variant="outline"

                      className="h-8"

                      disabled={processingRequestId === req.id}

                      onClick={() => handleRejectRequest(req.id)}

                    >

                      <XCircle className="h-3.5 w-3.5 mr-1" />

                      Reject

                    </Button>

                  </div>

                </div>

              ))

            )}

          </CardContent>

        </Card>

      )}



      <Card>

        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>

            <CardTitle className="flex items-center gap-2">

              <GraduationCap className="h-5 w-5" />

              Enrolled students

            </CardTitle>

            <CardDescription>{filtered.length} student record(s)</CardDescription>

          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">

            <select

              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"

              value={courseFilter}

              onChange={(e) => setCourseFilter(e.target.value)}

            >

              <option value="all">All courses</option>

              {courses.map((c) => (

                <option key={c.id} value={String(c.id)}>

                  {c.title ?? `Course #${c.id}`}

                </option>

              ))}

            </select>

            <select

              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"

              value={shiftFilter}

              onChange={(e) => setShiftFilter(e.target.value)}

            >

              <option value="all">All study shifts</option>

              {shiftOptions.map((shift) => (

                <option key={shift.id} value={String(shift.id)}>

                  {shift.label ?? `Shift #${shift.id}`}

                </option>

              ))}

            </select>

            <Input

              className="h-9 w-full sm:w-[220px]"

              placeholder="Search name, email, shift..."

              value={search}

              onChange={(e) => setSearch(e.target.value)}

            />

          </div>

        </CardHeader>

        <CardContent>

          {loading && !data ? (

            <TableSkeleton rows={6} cols={11} />

          ) : filtered.length === 0 ? (

            <p className="text-sm text-muted-foreground">

              {students.length === 0

                ? "No enrolled students found for your courses."

                : "No students match the selected filters."}

            </p>

          ) : (

            <div className="overflow-x-auto">

              <Table>

                <TableHeader>

                  <TableRow>

                    <TableHead>Student</TableHead>

                    <TableHead>Email</TableHead>

                    <TableHead>Course</TableHead>

                    <TableHead>Price</TableHead>

                    <TableHead>Payment</TableHead>

                    <TableHead>Country</TableHead>

                    <TableHead>Status</TableHead>

                    <TableHead>Study shifts</TableHead>

                    <TableHead>Enrolled</TableHead>

                    <TableHead className="w-[90px]">Shifts</TableHead>

                    <TableHead className="w-[140px]">Manage</TableHead>

                  </TableRow>

                </TableHeader>

                <TableBody>

                  {filtered.map((row) => (
                    <TableRow
                      key={row.enrollment_id}
                      className={isPendingEnrollmentApproval(row.status) ? "bg-amber-50/60" : undefined}
                    >

                      <TableCell className="font-medium">{row.name || "—"}</TableCell>

                      <TableCell>{row.email || "—"}</TableCell>

                      <TableCell>{row.course_title || "—"}</TableCell>

                      <TableCell>
                        {(row.course_price ?? 0) > 0 ? (
                          <span className="text-sm font-medium">${Number(row.course_price).toFixed(2)}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className={row.payment_paid ? "text-emerald-700 font-medium" : "text-amber-700"}>
                          {enrollmentPaymentStatusText(row.status)}
                        </span>
                      </TableCell>

                      <TableCell>{row.country || "—"}</TableCell>

                      <TableCell>
                        <Badge
                          variant={isPendingEnrollmentApproval(row.status) ? "outline" : "secondary"}
                          className={isPendingEnrollmentApproval(row.status) ? "border-amber-300 text-amber-800" : ""}
                        >
                          {row.status ?? "enrolled"}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-[280px]">

                        {(row.study_shifts ?? []).length > 0 ? (

                          <div className="flex flex-wrap gap-1">

                            {(row.study_shifts ?? []).map((shift) => (

                              <Badge

                                key={shift.id}

                                variant="outline"

                                className="text-[10px] font-normal whitespace-nowrap"

                              >

                                {shift.label ??

                                  `${shift.name} · ${shift.day_label} ${shift.start_time}–${shift.end_time}`}

                              </Badge>

                            ))}

                          </div>

                        ) : (

                          <span className="text-muted-foreground text-xs">—</span>

                        )}

                      </TableCell>

                      <TableCell className="text-muted-foreground text-sm">

                        {row.enrolled_at ? new Date(row.enrolled_at).toLocaleDateString() : "—"}

                      </TableCell>

                      <TableCell>

                        <Button

                          variant="ghost"

                          size="sm"

                          className="h-8 px-2"

                          onClick={() =>

                            setShiftEditor({

                              studentId: row.student_id,

                              courseId: row.course_id,

                              courseTitle: row.course_title,

                              studentName: row.name,

                              currentShifts: row.study_shifts ?? [],

                            })

                          }

                        >

                          <Pencil className="h-3.5 w-3.5" />

                        </Button>

                      </TableCell>

                      <TableCell>
                        <EnrollmentManageActions
                          studentId={row.student_id}
                          courseId={row.course_id}
                          status={row.status ?? "enrolled"}
                          staffEmail={staffEmail}
                          compact
                          onUpdated={async () => {
                            invalidateDashboardCache(dashboardCacheKey("instructor-students", email));
                            await reload();
                          }}
                          onReject={async () => {
                            const reason = window.prompt("Optional reason for rejection:");
                            if (reason === null) return;
                            await rejectCourseEnrollment(
                              row.course_id,
                              row.student_id,
                              reason || undefined,
                              staffEmail
                            );
                            invalidateDashboardCache(dashboardCacheKey("instructor-students", email));
                            await reload();
                            toast({ variant: "success" as any, title: "Enrollment rejected" });
                          }}
                        />
                      </TableCell>

                    </TableRow>

                  ))}

                </TableBody>

              </Table>

            </div>

          )}

        </CardContent>

      </Card>



      {shiftEditor && (

        <EnrollmentShiftEditor

          open={!!shiftEditor}

          onOpenChange={(open) => !open && setShiftEditor(null)}

          courseId={shiftEditor.courseId}

          courseTitle={shiftEditor.courseTitle}

          studentName={shiftEditor.studentName}

          currentShifts={shiftEditor.currentShifts}

          initialShiftIds={(shiftEditor.currentShifts ?? []).map((s) => s.id)}

          saving={savingShifts}

          onSave={handleSaveShifts}

        />

      )}

    </div>

  );

};



export default InstructorStudents;

