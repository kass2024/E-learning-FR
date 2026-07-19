import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Pencil, Trash2, ShieldOff, ShieldCheck } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createCourse, getCourses, updateCourse, deleteCourse, assignCourseToUser, getUsers, getLearningPrograms, moveCourseToProgram, CoursePayload, UserPayload, type LearningProgramPayload } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { fetchDashboardCached, invalidateDashboardCache } from "@/lib/dashboardCache";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { CourseDetailsFormFields } from "@/components/courses/CourseDetailsFormFields";
import {
  appendCourseDetailsToFormData,
  courseDetailsFromCourse,
  DEFAULT_HOW_TO_USE,
  type CourseDetailsFields,
} from "@/lib/courseDetails";

type CourseRow = CoursePayload & { id?: number };
type Instructor = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

const CourseManagement = () => {
  const { toast } = useToast();
  const {
    data: coursesData,
    loading,
    reload: reloadCourses,
  } = useDashboardQuery<CourseRow[]>("courses-list", getCourses);
  const courses = Array.isArray(coursesData) ? coursesData : [];
  const refreshCourses = async () => {
    invalidateDashboardCache("courses-list");
    invalidateDashboardCache("instructors-with-courses");
    await reloadCourses();
    setPage(1);
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [requirements, setRequirements] = useState("");
  const [image, setImage] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningCourse, setAssigningCourse] = useState<CourseRow | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);
  const {
    data: programsData,
    loading: programsLoading,
  } = useDashboardQuery<LearningProgramPayload[]>(
    "learning-programs-picker",
    () => getLearningPrograms({ activeOnly: false })
  );
  const programs = Array.isArray(programsData) ? programsData : [];
  const [movingProgramCourseId, setMovingProgramCourseId] = useState<number | null>(null);
  const [assigningToInstructor, setAssigningToInstructor] = useState(false);
  const [details, setDetails] = useState<CourseDetailsFields>({ how_to_use: DEFAULT_HOW_TO_USE });

  const loadInstructorsList = async (): Promise<Instructor[]> => {
    setInstructorsLoading(true);
    try {
      const { data } = await fetchDashboardCached("users-list", getUsers, { force: true });
      const rows = (Array.isArray(data) ? data : []) as (UserPayload & { id: number })[];
      const onlyInstructors: Instructor[] = rows
        .filter((u) => u.role === "instructor")
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
        }));
      setInstructors(onlyInstructors);
      return onlyInstructors;
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load instructors.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
      return [];
    } finally {
      setInstructorsLoading(false);
    }
  };

  const handleQuickProgramChange = async (courseId: number, programId: number) => {
    setMovingProgramCourseId(courseId);
    try {
      await moveCourseToProgram(courseId, programId);
      toast({
        title: "Program updated",
        description: "Course moved to the selected program.",
        duration: 3000,
      });
      invalidateDashboardCache("learning-programs-list");
      await refreshCourses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Could not change program.",
        duration: 4000,
      });
    } finally {
      setMovingProgramCourseId(null);
    }
  };

  const loadCourses = refreshCourses;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCourses = normalizedSearch
    ? courses.filter((course) => {
        const titleValue = (course.title ?? "").toLowerCase();
        const descValue = (course.description ?? "").toLowerCase();
        const codeValue = (course.course_code ?? "").toLowerCase();
        return titleValue.includes(normalizedSearch) || descValue.includes(normalizedSearch) || codeValue.includes(normalizedSearch);
      })
    : courses;

  const total = filteredCourses.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  const handleChangePage = (newPage: number) => {
    if (newPage < 1 || newPage > pageCount) return;
    setPage(newPage);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setDuration("");
    setRequirements("");
    setImage("");
    setImageFile(null);
    setStatus("Active");
    setEditingCourse(null);
    setProgramId(null);
    setDetails({ how_to_use: DEFAULT_HOW_TO_USE });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) {
      toast({
        variant: "destructive",
        title: "Program required",
        description: "Select a program this course belongs to.",
        duration: 4000,
      });
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("program_id", String(programId));
      if (description) form.append("description", description);
      if (price) form.append("price", price);
      if (duration) form.append("duration", duration);
      if (requirements) form.append("requirements", requirements);
      if (status) form.append("status", status);
      if (imageFile) form.append("image", imageFile);
      appendCourseDetailsToFormData(form, details);
      if (!details.course_code) form.append("auto_generate_code", "1");

      if (editingCourse && editingCourse.id) {
        await updateCourse(editingCourse.id, form as any);
      } else {
        await createCourse(form as any);
      }

      toast({
        variant: "success" as any,
        title: "Success",
        description: editingCourse
          ? "Course updated successfully"
          : "Course created. Use Assign to link it to an instructor.",
        duration: 4000,
      });

      resetForm();
      setIsDialogOpen(false);
      await loadCourses();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to save course. Please try again.";
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

  const handleEditCourse = (course: CourseRow) => {
    setTitle(course.title ?? "");
    setDescription(course.description ?? "");
    setPrice(course.price != null ? String(course.price) : "");
    setDuration(course.duration ?? "");
    setRequirements(course.requirements ?? "");
    setImage(course.image ?? "");
    setImageFile(null);
    setStatus(course.status ?? "Active");
    setProgramId(course.program_id ?? course.program?.id ?? null);
    setDetails(courseDetailsFromCourse(course));
    setEditingCourse(course);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (course: CourseRow) => {
    if (!course.id) return;
    const currentStatus = (course.status ?? "Active").toLowerCase();
    const nextStatus = currentStatus === "inactive" ? "Active" : "Inactive";
    try {
      await updateCourse(course.id, { status: nextStatus });
      toast({
        title: "Status updated",
        description: `Course status changed to ${nextStatus}.`,
        duration: 4000,
      });
      await loadCourses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to update status.",
        duration: 4000,
      });
    }
  };
  const handleOpenAssignDialog = async (course: CourseRow) => {
    if (!course.id) return;
    setAssigningCourse(course);
    setAssignDialogOpen(true);

    const onlyInstructors = await loadInstructorsList();
    setSelectedInstructorId(onlyInstructors[0]?.id ?? null);
  };

  const handleAssignToInstructor = async (instructorId: number) => {
    if (!assigningCourse || !assigningCourse.id || !instructorId) return;
    try {
      setAssigningToInstructor(true);
      await assignCourseToUser(assigningCourse.id, instructorId);
      toast({
        variant: "success" as any,
        title: "Course assigned successfully",
        description: "The course has been assigned to the instructor.",
        duration: 4000,
      });
      setAssignDialogOpen(false);
      setAssigningCourse(null);
      await loadCourses();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to assign course to instructor.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setAssigningToInstructor(false);
    }
  };

  const filteredInstructors = instructors.filter((inst) => {
    const query = instructorSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      inst.name.toLowerCase().includes(query) ||
      (inst.email ?? "").toLowerCase().includes(query)
    );
  });

  const handleDeleteCourse = async (course: CourseRow) => {
    if (!course.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${course.title ?? "this course"}?`);
    if (!confirmed) return;
    try {
      await deleteCourse(course.id);
      toast({
        variant: "destructive",
        title: "Course deleted",
        description: "The course has been deleted.",
        duration: 4000,
      });
      await loadCourses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete course.",
        duration: 4000,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Courses</h1>
            <p className="text-sm text-muted-foreground">Manage training courses.</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="hero"
              onClick={() => {
                resetForm();
              }}
            >
              Create Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "Create Course"}</DialogTitle>
              <DialogDescription>
                {editingCourse
                  ? "Update basics and learner guide sections (overview, guidelines, policies)."
                  : "Add a new training course."}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4 flex-1 overflow-y-auto pr-1" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                <select
                  id="program"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={programId ?? ""}
                  onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : null)}
                  required
                  disabled={programsLoading}
                >
                  <option value="">{programsLoading ? "Loading programs…" : "Select a program"}</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {programs.length === 0 && !programsLoading && (
                  <p className="text-xs text-muted-foreground">
                    No programs yet. Create one under Programs first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Course title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the course"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Any prerequisites or requirements"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="199.99"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 6 weeks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending (awaiting approval)</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Course Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                  }}
                />
                {image && !imageFile && (
                  <p className="text-xs text-muted-foreground truncate">Current: {image}</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <p className="text-sm font-semibold">Learner course guide</p>
                <p className="text-xs text-muted-foreground">
                  These details appear on the learner dashboard — overview, guidelines, and policies.
                </p>
                <CourseDetailsFormFields
                  value={details}
                  onChange={setDetails}
                  courseTitle={title}
                  showCode
                />
              </div>

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
          <CardTitle className="text-lg font-semibold">Courses List</CardTitle>
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
              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  placeholder=""
                  className="h-8 w-[200px] text-sm"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border border-border rounded-md">
                <TableHeader>
                  <TableRow className="border-b border-border text-xs text-muted-foreground bg-muted/40">
                    <TableHead className="w-[40px] text-center">#</TableHead>
                    <TableHead className="w-[90px]">Code</TableHead>
                    <TableHead className="w-[140px]">Program</TableHead>
                    <TableHead className="w-[200px]">Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Price</TableHead>
                    <TableHead className="w-[140px]">Duration</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[140px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCourses.map((course, index) => {
                    const currentStatus = course.status ?? "Active";
                    const isInactive = currentStatus.toLowerCase() === "inactive";
                    const shortDescription = (course.description ?? "").slice(0, 80) + ((course.description ?? "").length > 80 ? "..." : "");
                    return (
                      <TableRow key={course.id ?? course.title} className="border-b border-border last:border-0">
                        <TableCell className="text-center text-muted-foreground">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {course.course_code || "—"}
                        </TableCell>
                        <TableCell>
                          <select
                            className="h-8 w-full min-w-[120px] max-w-[160px] rounded-md border border-input bg-background px-2 text-xs"
                            value={course.program_id ?? course.program?.id ?? ""}
                            disabled={!course.id || movingProgramCourseId === course.id}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (course.id && next) handleQuickProgramChange(course.id, next);
                            }}
                          >
                            <option value="" disabled>
                              Program
                            </option>
                            {programs.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{course.title}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs whitespace-normal">
                          {shortDescription}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {course.price != null ? `$${course.price}` : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{course.duration ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={isInactive ? "outline" : "default"}>{currentStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditCourse(course)}
                              title="Edit course"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={isInactive ? "outline" : "secondary"}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleStatus(course)}
                              title={isInactive ? "Activate course" : "Deactivate course"}
                            >
                              {isInactive ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <ShieldOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteCourse(course)}
                              title="Delete course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => handleOpenAssignDialog(course)}
                            >
                              Assign
                            </Button>
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
      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        setAssignDialogOpen(open);
        if (!open) {
          setAssigningCourse(null);
          setInstructorSearch("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Course to Instructor</DialogTitle>
            <DialogDescription>
              {assigningCourse ? `Select an instructor for "${assigningCourse.title}".` : "Select an instructor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search instructors by name or email"
              value={instructorSearch}
              onChange={(e) => setInstructorSearch(e.target.value)}
              className="h-9"
            />
            <div className="border rounded-md">
              {instructorsLoading ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading instructors...</span>
                </div>
              ) : filteredInstructors.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No instructors found.</div>
              ) : (
                <select
                  className="w-full border-0 bg-transparent px-3 py-2 text-sm focus:outline-none"
                  value={selectedInstructorId ?? ""}
                  onChange={(e) => setSelectedInstructorId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="" disabled>
                    Select an instructor
                  </option>
                  {filteredInstructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} {inst.email ? `(${inst.email})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="default"
              disabled={!selectedInstructorId || instructorsLoading || assigningToInstructor}
              onClick={() => {
                if (selectedInstructorId) {
                  handleAssignToInstructor(selectedInstructorId);
                }
              }}
            >
              {assigningToInstructor ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Assigning...</span>
                </span>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseManagement;
