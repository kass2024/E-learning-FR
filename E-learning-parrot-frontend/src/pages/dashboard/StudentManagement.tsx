import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, GraduationCap, Users, Pencil, Trash2, ArrowRightCircle, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getCourses,
  enrollInCourse,
  getStudentCourseEnrollments,
  approveCourseEnrollment,
  rejectCourseEnrollment,
  updateEnrollmentStudyShifts,
  getStudyShiftChangeRequests,
  approveStudyShiftChangeRequest,
  rejectStudyShiftChangeRequest,
  getPlatformInstitutions,
  type CoursePayload,
  type PlatformInstitutionInfo,
} from "@/api/axios";
import type { StudentPayload } from "@/lib/models";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { fetchDashboardCached, invalidateDashboardCache } from "@/lib/dashboardCache";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { startAdminViewAs } from "@/lib/adminImpersonation";
import { filterBySmartSearch } from "@/lib/smartSearch";
import { formatEnrollmentShiftsSummary } from "@/lib/studyShiftUtils";
import { EnrollmentShiftEditor } from "@/components/study-shifts/EnrollmentShiftEditor";
import { EnrollmentManageActions } from "@/components/enrollments/EnrollmentManageActions";
import { enrollmentPaymentStatusText } from "@/lib/enrollmentStatus";
import { getInstructorEmail } from "@/lib/dashboardUser";

interface StudentRow extends StudentPayload {
  id?: number;
  created_at?: string;
}

interface StudentCourseEnrollmentRow {
  enrollment_id?: number;
  course_id: number;
  course_title?: string | null;
  course_price?: number;
  status: string;
  payment_paid?: boolean;
  has_access?: boolean;
  level?: string | null;
  study_shifts?: Array<{
    id: number;
    label?: string;
    name?: string;
    day_label?: string;
    start_time?: string;
    end_time?: string;
  }>;
}

interface CourseRow extends CoursePayload {
  id?: number;
}

const StudentManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMainAdmin = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase() === "admin";

  const {
    data: studentsData,
    loading: loadingStudents,
    reload: reloadStudents,
  } = useDashboardQuery<StudentRow[]>("students-list", getStudents);
  const students = studentsData ?? [];
  const loadStudents = async () => {
    invalidateDashboardCache("students-list");
    await reloadStudents();
    setPage(1);
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Active");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [platformInstitutionId, setPlatformInstitutionId] = useState<number | "">("");
  const [institutionOptions, setInstitutionOptions] = useState<PlatformInstitutionInfo[]>([]);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [enrolling, setEnrolling] = useState(false);
  const [studentEnrollments, setStudentEnrollments] = useState<StudentCourseEnrollmentRow[]>([]);

  // For course selection at student creation time
  const [createCourses, setCreateCourses] = useState<CourseRow[]>([]);
  const [createCoursesLoading, setCreateCoursesLoading] = useState(false);
  const [selectedCreateCourseIds, setSelectedCreateCourseIds] = useState<number[]>([]);
  const [createCourseLevels, setCreateCourseLevels] = useState<Record<number, string>>({});

  // Loading / modal states for per-course actions
  const [approvingCourseId, setApprovingCourseId] = useState<number | null>(null);
  const [approvingStudentId, setApprovingStudentId] = useState<number | null>(null);

  // Reject enrollment modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectCourseId, setRejectCourseId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [shiftEditor, setShiftEditor] = useState<{
    studentId: number;
    courseId: number;
    courseTitle?: string;
    studentName?: string;
    currentShifts: StudentCourseEnrollmentRow["study_shifts"];
  } | null>(null);
  const [savingShifts, setSavingShifts] = useState(false);
  const [pendingShiftRequests, setPendingShiftRequests] = useState<
    Awaited<ReturnType<typeof getStudyShiftChangeRequests>>["requests"]
  >([]);
  const [processingShiftRequestId, setProcessingShiftRequestId] = useState<number | null>(null);

  const staffEmail = getInstructorEmail() ?? undefined;

  useEffect(() => {
    if (!isMainAdmin) return;
    getPlatformInstitutions()
      .then((rows) => setInstitutionOptions(Array.isArray(rows) ? rows.filter((r) => r.status === "active") : []))
      .catch(() => setInstitutionOptions([]));
  }, [isMainAdmin]);

  const loadPendingShiftRequests = async () => {
    try {
      const result = await getStudyShiftChangeRequests({ status: "pending", email: staffEmail });
      setPendingShiftRequests(result.requests ?? []);
    } catch {
      setPendingShiftRequests([]);
    }
  };

  const handleSaveEnrollmentShifts = async (shiftIds: number[]) => {
    if (!shiftEditor || !selectedStudent?.id) return;
    setSavingShifts(true);
    try {
      await updateEnrollmentStudyShifts(shiftEditor.courseId, selectedStudent.id, shiftIds, staffEmail);
      toast({ title: "Study shifts updated" });
      setShiftEditor(null);
      const enrollmentData = await getStudentCourseEnrollments(selectedStudent.id);
      setStudentEnrollments(enrollmentData?.enrollments ?? []);
      await loadPendingShiftRequests();
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

  const handleApproveShiftRequest = async (requestId: number) => {
    setProcessingShiftRequestId(requestId);
    try {
      await approveStudyShiftChangeRequest(requestId, staffEmail);
      toast({ title: "Shift change approved" });
      if (selectedStudent?.id) {
        const enrollmentData = await getStudentCourseEnrollments(selectedStudent.id);
        setStudentEnrollments(enrollmentData?.enrollments ?? []);
      }
      await loadPendingShiftRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setProcessingShiftRequestId(null);
    }
  };

  const handleRejectShiftRequest = async (requestId: number) => {
    setProcessingShiftRequestId(requestId);
    try {
      await rejectStudyShiftChangeRequest(requestId, staffEmail);
      toast({ title: "Shift change rejected" });
      await loadPendingShiftRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setProcessingShiftRequestId(null);
    }
  };

  const levels = [
    { id: "beginner", label: "Beginner" },
    { id: "elementary", label: "Elementary" },
    { id: "intermediate", label: "Intermediate" },
    { id: "upper_intermediate", label: "Upper Intermediate" },
    { id: "advanced", label: "Advanced" },
    { id: "upper_advanced", label: "Proficient" },
  ];

  const levelLabelMap: Record<string, string> = levels.reduce((acc, lvl) => {
    acc[lvl.id] = lvl.label;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    loadPendingShiftRequests();
  }, []);

  const loadCreateCourses = async () => {
    setCreateCoursesLoading(true);
    try {
      const { data: courseData } = await fetchDashboardCached("courses-list", getCourses);
      setCreateCourses(Array.isArray(courseData) ? courseData : []);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load courses for selection.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setCreateCoursesLoading(false);
    }
  };

  const toggleCreateCourseSelection = (courseId: number) => {
    setSelectedCreateCourseIds((prev) => {
      if (prev.includes(courseId)) {
        const next = prev.filter((id) => id !== courseId);
        setCreateCourseLevels((levelsPrev) => {
          const copy = { ...levelsPrev };
          delete copy[courseId];
          return copy;
        });
        return next;
      }
      return [...prev, courseId];
    });
  };

  const handleOpenRejectModal = (courseId: number) => {
    if (!selectedStudent?.id) return;
    setRejectCourseId(courseId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmRejectEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent?.id || rejectCourseId == null) return;

    try {
      setRejecting(true);
      await rejectCourseEnrollment(rejectCourseId, selectedStudent.id, rejectReason || undefined);
      toast({
        variant: "destructive",
        title: "Course enrollment rejected",
        description:
          rejectReason && rejectReason.trim().length > 0
            ? `Status set to Rejected. Reason: ${rejectReason}`
            : "Status set to Rejected.",
        duration: 5000,
      });
      const enrollmentData = await getStudentCourseEnrollments(selectedStudent.id);
      setStudentEnrollments(enrollmentData?.enrollments ?? []);
      setRejectModalOpen(false);
      setRejectCourseId(null);
      setRejectReason("");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to reject enrollment.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleApproveEnrollment = async (courseId: number) => {
    if (!selectedStudent?.id) return;
    const ok = window.confirm("Are you sure you want to approve this course enrollment?");
    if (!ok) return;
    try {
      setApprovingCourseId(courseId);
      await approveCourseEnrollment(courseId, selectedStudent.id);
      toast({
        variant: "success" as any,
        title: "Course enrollment approved",
        description: "The learner now has full access to course materials. You can send a payment link when ready.",
        duration: 4000,
      });
      const enrollmentData = await getStudentCourseEnrollments(selectedStudent.id);
      setStudentEnrollments(enrollmentData?.enrollments ?? []);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to approve enrollment.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    }
  };

  const handleApproveStudent = async (student: StudentRow) => {
    if (!student.id) return;
    setApprovingStudentId(student.id);
    try {
      const payload: StudentPayload = {
        first_name: student.first_name ?? "",
        last_name: student.last_name ?? "",
        email: student.email ?? "",
        name: (student.name ?? `${student.first_name ?? ""} ${student.last_name ?? ""}`).trim() ||
          (student.email ?? ""),
        status: "Active",
        phone: student.phone ?? "",
        country: student.country ?? "",
        primary_goal: student.primary_goal ?? "",
      };

      await updateStudent(student.id, payload);
      toast({
        variant: "success" as any,
        title: "Student approved",
        description: `${payload.name || payload.email} can now sign in and access their dashboard.`,
        duration: 4000,
      });
      await loadStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to approve student. Please try again.",
        duration: 4000,
      });
    } finally {
      setApprovingStudentId(null);
    }
  };

  const handleRejectStudent = async (student: StudentRow) => {
    if (!student.id) return;
    const confirmed = window.confirm(
      `Reject ${student.name ?? student.email}? They will not be able to sign in until re-approved.`
    );
    if (!confirmed) return;

    setApprovingStudentId(student.id);
    try {
      await updateStudent(student.id, {
        first_name: student.first_name ?? "",
        last_name: student.last_name ?? "",
        email: student.email ?? "",
        status: "Rejected",
        phone: student.phone ?? "",
        country: student.country ?? "",
        primary_goal: student.primary_goal ?? "",
      });
      toast({
        variant: "destructive",
        title: "Student rejected",
        description: "The student account has been marked as Rejected.",
      });
      await loadStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to reject student.",
      });
    } finally {
      setApprovingStudentId(null);
    }
  };

  const isStudentPending = (status?: string) => {
    const lower = (status ?? "Active").toLowerCase();
    return lower === "pending";
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setStatus("Active");
    setPassword("");
    setPhone("");
    setCountry("");
    setPrimaryGoal("");
    setPlatformInstitutionId("");
    setSelectedCreateCourseIds([]);
    setCreateCourseLevels({});
    setEditingStudent(null);
  };

  const handleEditStudent = (student: StudentRow) => {
    setEditingStudent(student);
    setFirstName(student.first_name || "");
    setLastName(student.last_name || "");
    setEmail(student.email || "");
    setStatus(student.status || "Active");
    setPassword("");
    setPhone("");
    setCountry("");
    setPrimaryGoal("");
    setPlatformInstitutionId(student.platform_institution_id ?? "");
    setIsDialogOpen(true);
  };

  const handleDeleteStudent = async (student: StudentRow) => {
    if (!student.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${student.name ?? "this student"}?`);
    if (!confirmed) return;
    try {
      await deleteStudent(student.id);
      toast({
        variant: "destructive",
        title: "Student deleted",
        description: "The student has been deleted.",
        duration: 4000,
      });
      await loadStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete student.",
        duration: 4000,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Map selected course IDs (for enrollment) to course titles (for email), including level
    const selectedCourseTitles: string[] = !editingStudent && selectedCreateCourseIds.length > 0
      ? createCourses
          .filter((c) => c.id && selectedCreateCourseIds.includes(c.id))
          .map((c) => {
            const title = c.title ?? "";
            const id = c.id as number | undefined;
            if (!id) return title;
            const levelId = createCourseLevels[id];
            if (!levelId) return title;
            const levelFriendly = levels.find((lvl) => lvl.id === levelId)?.label ?? levelId;
            return `${title} (Level: ${levelFriendly})`;
          })
          .filter((title): title is string => Boolean(title && title.trim()))
      : [];

    const payload: StudentPayload = {
      first_name: firstName,
      last_name: lastName,
      email,
      name: `${firstName} ${lastName}`.trim() || email,
      status,
      phone: phone || undefined,
      country: country || undefined,
      primary_goal: primaryGoal || undefined,
      password: password || undefined,
      platform_institution_id: platformInstitutionId === "" ? null : Number(platformInstitutionId),
      selected_courses: selectedCourseTitles.length > 0 ? selectedCourseTitles : undefined,
    };
    try {
      let created: any | null = null;
      if (editingStudent && editingStudent.id) {
        await updateStudent(editingStudent.id, payload);
      } else {
        created = await createStudent(payload);
      }
      toast({
        variant: "success" as any,
        title: editingStudent ? "Student updated" : "Student account created",
        description: editingStudent
          ? "Student details have been updated."
          : "The learner account has been created successfully.",
        duration: 4000,
      });

      // If this is a new student and admin selected courses, auto-enroll them
      if (!editingStudent && created && selectedCreateCourseIds.length > 0) {
        const newId = (created as any).id as number | undefined;
        if (newId && Number.isFinite(newId)) {
          try {
            await Promise.all(
              selectedCreateCourseIds.map((courseId) =>
                enrollInCourse(courseId, newId, createCourseLevels[courseId]).catch(() => null)
              )
            );
            toast({
              variant: "success" as any,
              title: "Course application received",
              description:
                "The learner has been applied to the selected courses. You can manage approvals from Student Management.",
              duration: 5000,
            });
          } catch (err) {
            console.error("Failed to auto-enroll created student in courses", err);
          }
        }
      }
      resetForm();
      setIsDialogOpen(false);
      await loadStudents();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to save student. Please check the data and try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(
    () =>
      filterBySmartSearch(students, search, (student) => [
        student.name,
        student.first_name,
        student.last_name,
        student.email,
        student.status,
        student.phone,
        student.country,
        student.primary_goal,
      ]),
    [students, search]
  );

  const total = filteredStudents.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > pageCount) return;
    setPage(newPage);
  };

  const openEnrollDialog = async (student: StudentRow) => {
    if (!student.id) return;
    setSelectedStudent(student);
    setEnrollDialogOpen(true);
    setCoursesLoading(true);
    try {
      const [courseData, enrollmentData] = await Promise.all([
        getCourses(),
        getStudentCourseEnrollments(student.id),
      ]);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setStudentEnrollments(enrollmentData?.enrollments ?? []);
      setSelectedCourseId("");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load courses or enrollments.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedStudent?.id || !selectedCourseId) return;
    try {
      setEnrolling(true);
      await enrollInCourse(Number(selectedCourseId), selectedStudent.id, undefined, undefined, true);
      toast({
        variant: "success" as any,
        title: "Enrollment successful",
        description: "Student enrolled with full course access. Payment can be sent later.",
        duration: 4000,
      });
      const enrollmentData = await getStudentCourseEnrollments(selectedStudent.id);
      setStudentEnrollments(enrollmentData?.enrollments ?? []);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to enroll student in course.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleViewAsStudent = (student: StudentRow) => {
    const displayName = student.name || `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || student.email;

    const started = startAdminViewAs({
      viewAsRole: "learner",
      viewAsName: displayName || "Student",
      viewAsEmail: student.email ?? null,
      viewAsStudentId: student.id ?? null,
      returnPath: "/dashboard/students",
    });

    if (!started) {
      toast({
        variant: "destructive",
        title: "Could not switch view",
        description: "You do not have permission to preview as this student.",
        duration: 4000,
      });
      return;
    }

    toast({
      variant: "success" as any,
      title: "Switched to student view",
      description: "You are now viewing the dashboard as this student.",
      duration: 4000,
    });
    navigate("/dashboard/learner");
  };

  const getEnrollmentStatus = (courseId: number) => {
    const record = studentEnrollments.find((e) => e.course_id === courseId);
    return record?.status ?? "not_enrolled";
  };

  return (
    <div className="space-y-6">
      {pendingShiftRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Pending shift change requests</CardTitle>
            <CardDescription>{pendingShiftRequests.length} learner request(s) awaiting review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingShiftRequests.map((req) => (
              <div key={req.id} className="rounded-lg border bg-white p-3 space-y-2">
                <p className="font-medium text-sm">
                  {req.student_name} · {req.course_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatEnrollmentShiftsSummary(req.current_shifts ?? [])} →{" "}
                  {formatEnrollmentShiftsSummary(req.requested_shifts ?? [])}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={processingShiftRequestId === req.id}
                    onClick={() => handleApproveShiftRequest(req.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={processingShiftRequestId === req.id}
                    onClick={() => handleRejectShiftRequest(req.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Student Management</h1>
            <p className="text-sm text-muted-foreground">
              Create students, manage their enrollments, and quickly switch to their learner view.
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="hero"
              onClick={() => {
                resetForm();
                loadCreateCourses();
              }}
            >
              Create Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Edit Student" : "Create Student"}</DialogTitle>
              <DialogDescription>
                {editingStudent
                  ? "Update the student details. Students can log in with their email and the default password 12345678 if no password is set."
                  : "Add a new student. They can log in with their email and the default password 12345678 if no password is set."}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-5 pt-2" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name (optional)</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm h-11"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {isMainAdmin && (
                <div className="space-y-1.5">
                  <Label htmlFor="platformInstitution">Partner institution</Label>
                  <select
                    id="platformInstitution"
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm h-11"
                    value={platformInstitutionId}
                    onChange={(e) => setPlatformInstitutionId(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">Main platform (F&R Rwanda Ltd)</option>
                    {institutionOptions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Move this learner to a partner institution or keep them on the main platform.
                  </p>
                </div>
              )}

              {/* Password / Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>
              </div>

              {/* Country / Primary goal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country (optional)</Label>
                  <Input
                    id="country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="primaryGoal">Primary Goal (optional)</Label>
                  <Input
                    id="primaryGoal"
                    type="text"
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                    className="h-11 w-full"
                  />
                </div>
              </div>

              {/* Course + level selection for new students */}
              {!editingStudent && (
                <div className="space-y-2">
                  <Label>Select courses (optional)</Label>
                  {createCoursesLoading ? (
                    <p className="text-xs text-muted-foreground">Loading courses...</p>
                  ) : createCourses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No courses available to assign.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-md border border-input bg-background/60 px-3 py-2 space-y-3 text-sm">
                      {createCourses.map((course) => {
                        const id = course.id as number | undefined;
                        if (!id) return null;
                        const title = course.title ?? "";
                        const isChecked = selectedCreateCourseIds.includes(id);
                        const isParrotAICourse = title.includes("Xander AI Mastery Class");
                        const isFrenchCourse = title.toLowerCase().includes("french") ||
                          title.toLowerCase().includes("tcf") ||
                          title.toLowerCase().includes("tef");

                        return (
                          <div key={id} className="border border-border/60 rounded-md px-2.5 py-2 bg-background/80">
                            <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5"
                                checked={isChecked}
                                onChange={() => toggleCreateCourseSelection(id)}
                              />
                              <span className="truncate font-medium">
                                {course.title}
                              </span>
                            </label>

                            {isChecked && !isParrotAICourse && (
                              <div className="mt-2 pl-5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-muted-foreground">
                                    {isFrenchCourse ? "French" : "English"} level
                                  </span>
                                  {!createCourseLevels[id] && (
                                    <span className="text-[10px] text-amber-600">Required</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  {levels.map((lvl) => (
                                    <button
                                      key={lvl.id}
                                      type="button"
                                      onClick={() =>
                                        setCreateCourseLevels((prev) => ({
                                          ...prev,
                                          [id]: lvl.id,
                                        }))
                                      }
                                      className={`text-[11px] px-2 py-1 rounded border transition-colors text-left ${
                                        createCourseLevels[id] === lvl.id
                                          ? "border-primary bg-primary/10 text-primary font-medium"
                                          : "border-border bg-background hover:bg-muted/60"
                                      }`}
                                    >
                                      {lvl.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedCreateCourseIds.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Selected {selectedCreateCourseIds.length} course
                      {selectedCreateCourseIds.length > 1 ? "s" : ""} for this learner. Applications will be created after
                      the account is saved.
                    </p>
                  )}
                </div>
              )}

              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Students List</CardTitle>
          <CardDescription>Search, edit, enroll to courses, or view as a student.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 10);
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <SmartSearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Search name, email, status, country…"
                resultCount={filteredStudents.length}
                totalCount={students.length}
                className="w-full sm:w-72"
              />
            </div>
          </div>

          {loadingStudents ? (
            <TableSkeleton rows={8} cols={7} />
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border border-border rounded-md">
                <TableHeader>
                  <TableRow className="border-b border-border text-xs text-muted-foreground bg-muted/40">
                    <TableHead className="w-[40px] text-center">#</TableHead>
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[200px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student, index) => {
                    const currentStatus = student.status ?? "Active";
                    const isInactive = currentStatus.toLowerCase() === "inactive";
                    const isPending = isStudentPending(currentStatus);
                    const isRejected = currentStatus.toLowerCase() === "rejected";
                    const createdAt = student.created_at;
                    const joinDate = createdAt
                      ? new Date(createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-";

                    return (
                      <TableRow key={student.id ?? student.email} className="border-b border-border last:border-0">
                        <TableCell className="text-center text-muted-foreground">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {student.name || `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              isPending ? "secondary" : isRejected || isInactive ? "outline" : "default"
                            }
                            className={isPending ? "bg-amber-100 text-amber-900 hover:bg-amber-100" : undefined}
                          >
                            {currentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                                  disabled={approvingStudentId === student.id}
                                  onClick={() => handleApproveStudent(student)}
                                >
                                  {approvingStudentId === student.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5"
                                  disabled={approvingStudentId === student.id}
                                  onClick={() => handleRejectStudent(student)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5"
                              onClick={() => openEnrollDialog(student)}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Enroll
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5"
                              onClick={() => handleViewAsStudent(student)}
                            >
                              <ArrowRightCircle className="w-4 h-4 mr-1" />
                              View as
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" title="More actions">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit student
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleDeleteStudent(student)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete student
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground text-center">
                            Joined: {joinDate}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-4 text-xs text-muted-foreground">
                <div>
                  {total === 0
                    ? "Showing 0 to 0 of 0 entries"
                    : `Showing ${startIndex + 1} to ${endIndex} of ${total} entries`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => handleChangePage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="h-7 min-w-[32px] rounded-md border border-input bg-background px-2 flex items-center justify-center text-foreground">
                    {currentPage}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => handleChangePage(currentPage + 1)}
                    disabled={currentPage === pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={enrollDialogOpen}
        onOpenChange={(open) => {
          setEnrollDialogOpen(open);
          if (!open) {
            setSelectedStudent(null);
            setCourses([]);
            setStudentEnrollments([]);
            setSelectedCourseId("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Enrollments</DialogTitle>
            <DialogDescription>
              {selectedStudent
                ? `Enroll ${selectedStudent.name ?? selectedStudent.email} into courses and view their current enrollments.`
                : "Select a student to manage enrollments."}
            </DialogDescription>
          </DialogHeader>

          {coursesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading courses...</span>
            </div>
          ) : !selectedStudent ? (
            <p className="text-sm text-muted-foreground">No student selected.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">Enroll to course</Label>
                <p className="text-xs text-muted-foreground">
                  Select a course below to add it to this learner. Pending applications can then be
                  approved or rejected.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    id="course"
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id ?? course.title} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="sm:w-auto w-full"
                    disabled={!selectedCourseId || enrolling}
                    onClick={handleEnroll}
                  >
                    {enrolling ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Enrolling...</span>
                      </span>
                    ) : (
                      "Enroll"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Current enrollments</h3>
                <p className="text-xs text-muted-foreground">
                  Approve pending applications to grant immediate course access. Track unpaid enrollments and send payment links when ready. Remove learners who refuse to pay.
                </p>
                {studentEnrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No enrollments found for this student.</p>
                ) : (
                  <Table className="border border-border rounded-md text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead className="w-[72px]">Price</TableHead>
                        <TableHead className="w-[100px]">Payment</TableHead>
                        <TableHead className="w-[120px]">Level</TableHead>
                        <TableHead className="min-w-[160px]">Study shifts</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                        <TableHead className="w-[72px]">Shifts</TableHead>
                        <TableHead className="w-[72px]">Manage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentEnrollments.map((enrollment) => {
                        const course = courses.find((c) =>
                          c.id != null && Number(c.id) === Number(enrollment.course_id)
                        );
                        const rawStatus = enrollment.status;
                        const price = enrollment.course_price ?? course?.price ?? 0;

                        return (
                          <TableRow key={`${enrollment.course_id}-${enrollment.enrollment_id ?? enrollment.status}`}>
                            <TableCell>{enrollment.course_title ?? course?.title ?? enrollment.course_id}</TableCell>
                            <TableCell>
                              {Number(price) > 0 ? (
                                <span className="font-medium">${Number(price).toFixed(2)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  enrollment.payment_paid || rawStatus === "paid" || rawStatus === "completed"
                                    ? "text-emerald-700 font-medium"
                                    : "text-amber-700"
                                }
                              >
                                {enrollmentPaymentStatusText(rawStatus)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {enrollment.level ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground">
                                  {levelLabelMap[enrollment.level] ?? enrollment.level}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-[11px] text-muted-foreground">
                              {formatEnrollmentShiftsSummary(enrollment.study_shifts ?? [])}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {rawStatus === "enrolled"
                                  ? "Pending approval"
                                  : rawStatus === "approved"
                                    ? "Active"
                                    : rawStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  const course = courses.find((c) => Number(c.id) === Number(enrollment.course_id));
                                  setShiftEditor({
                                    studentId: selectedStudent!.id!,
                                    courseId: enrollment.course_id,
                                    courseTitle: course?.title,
                                    studentName: selectedStudent?.name ?? selectedStudent?.email,
                                    currentShifts: enrollment.study_shifts ?? [],
                                  });
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              {selectedStudent?.id ? (
                                <EnrollmentManageActions
                                  studentId={selectedStudent.id}
                                  courseId={enrollment.course_id}
                                  status={rawStatus}
                                  onUpdated={async () => {
                                    const enrollmentData = await getStudentCourseEnrollments(selectedStudent.id!);
                                    setStudentEnrollments(enrollmentData?.enrollments ?? []);
                                  }}
                                  onReject={() => handleOpenRejectModal(enrollment.course_id)}
                                />
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject enrollment modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject course enrollment</DialogTitle>
            <DialogDescription>
              This will mark the selected course application as <span className="font-semibold">Rejected</span>{" "}
              for this learner and send them an email notification.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleConfirmRejectEnrollment}>
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason (optional)</Label>
              <textarea
                id="rejectReason"
                className="w-full min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Share a short explanation to help the learner understand this decision."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                This text will appear in the rejection email. Leave it blank if you prefer a generic message.
              </p>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={rejecting}>
                {rejecting ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Rejecting...</span>
                  </span>
                ) : (
                  "Confirm reject"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {shiftEditor && selectedStudent && (
        <EnrollmentShiftEditor
          open={!!shiftEditor}
          onOpenChange={(open) => !open && setShiftEditor(null)}
          courseId={shiftEditor.courseId}
          courseTitle={shiftEditor.courseTitle}
          studentName={shiftEditor.studentName}
          currentShifts={shiftEditor.currentShifts}
          initialShiftIds={(shiftEditor.currentShifts ?? []).map((s) => s.id)}
          saving={savingShifts}
          onSave={handleSaveEnrollmentShifts}
        />
      )}
    </div>
  );
};

export default StudentManagement;
