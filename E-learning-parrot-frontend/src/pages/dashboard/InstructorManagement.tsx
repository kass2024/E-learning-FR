import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2, GraduationCap, Plus, ArrowRightCircle, RefreshCw, Pencil, Trash2 } from "lucide-react";
import {
  getInstructorsWithCourses,
  getCourses,
  assignCourseToUser,
  unassignCourseFromUser,
  createUser,
  updateUser,
  deleteUser,
  CoursePayload,
} from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { startAdminViewAs } from "@/lib/adminImpersonation";
import { filterBySmartSearch } from "@/lib/smartSearch";

interface InstructorWithCourses {
  id: number;
  name: string;
  email?: string;
  role?: string;
  status?: string;
  assigned_courses?: Array<{
    id: number;
    title?: string | null;
    status?: string | null;
  }>;
  assignedCourses?: Array<{
    id: number;
    title?: string | null;
    status?: string | null;
  }>;
}

type CourseRow = CoursePayload & { id?: number };

const InstructorManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    data: instructorsData,
    loading,
    refreshing,
    reload: reloadInstructors,
  } = useDashboardQuery<InstructorWithCourses[]>("instructors-with-courses", getInstructorsWithCourses);
  const instructors = useMemo(
    () => (Array.isArray(instructorsData) ? instructorsData : []),
    [instructorsData]
  );
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorWithCourses | null>(null);
  const [coursesDialogOpen, setCoursesDialogOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [assigningCourseId, setAssigningCourseId] = useState<number | null>(null);
  const [unassigningCourseId, setUnassigningCourseId] = useState<number | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<InstructorWithCourses | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("12345678");
  const [status, setStatus] = useState("Active");

  const resetCreateForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("12345678");
    setStatus("Active");
  };

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "First name and email are required.",
        duration: 4000,
      });
      return;
    }

    setCreating(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await createUser({
        name: fullName,
        email: email.trim(),
        password: password.trim() || "12345678",
        role: "instructor",
        status,
        phone,
      });
      toast({
        variant: "success" as any,
        title: "Instructor created",
        description: `${fullName} can now log in and be assigned courses.`,
        duration: 4000,
      });
      resetCreateForm();
      setCreateDialogOpen(false);
      invalidateDashboardCache("instructors-with-courses");
      await reloadInstructors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating instructor",
        description: error?.response?.data?.message || "Failed to create instructor. Please try again.",
        duration: 4000,
      });
    } finally {
      setCreating(false);
    }
  };

  const resetEditForm = () => {
    setEditingInstructor(null);
    setEditFirstName("");
    setEditLastName("");
    setEditEmail("");
    setEditPhone("");
    setEditStatus("Active");
    setEditPassword("");
  };

  const handleOpenEditDialog = (instructor: InstructorWithCourses) => {
    const [first = "", last = ""] = (instructor.name ?? "").split(" ", 2);
    setEditingInstructor(instructor);
    setEditFirstName(first);
    setEditLastName(last);
    setEditEmail(instructor.email ?? "");
    setEditPhone((instructor as { phone?: string }).phone ?? "");
    setEditStatus(instructor.status ?? "Active");
    setEditPassword("");
    setEditDialogOpen(true);
  };

  const handleSaveInstructorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstructor?.id || !editFirstName.trim() || !editEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "First name and email are required.",
        duration: 4000,
      });
      return;
    }

    setSavingEdit(true);
    try {
      const fullName = `${editFirstName} ${editLastName}`.trim();
      const payload: Record<string, string> = {
        name: fullName,
        email: editEmail.trim(),
        status: editStatus,
        phone: editPhone,
        role: "instructor",
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await updateUser(editingInstructor.id, payload);
      toast({
        variant: "success" as any,
        title: "Instructor updated",
        description: `${fullName} has been updated.`,
        duration: 4000,
      });
      resetEditForm();
      setEditDialogOpen(false);
      invalidateDashboardCache("instructors-with-courses");
      invalidateDashboardCache("users-list");
      await reloadInstructors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating instructor",
        description: error?.response?.data?.message || "Failed to update instructor.",
        duration: 4000,
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInstructor = async (instructor: InstructorWithCourses) => {
    if (!instructor.id) return;
    const confirmed = window.confirm(
      `Delete instructor "${instructor.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(instructor.id);
    try {
      await deleteUser(instructor.id);
      toast({
        variant: "destructive",
        title: "Instructor deleted",
        description: `${instructor.name} has been removed.`,
        duration: 4000,
      });
      invalidateDashboardCache("instructors-with-courses");
      invalidateDashboardCache("users-list");
      await reloadInstructors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting instructor",
        description: error?.response?.data?.message || "Failed to delete instructor.",
        duration: 4000,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getInstructorAssignedIds = (instructor: InstructorWithCourses | null): Set<number> => {
    if (!instructor) return new Set();
    const assigned = instructor.assignedCourses ?? instructor.assigned_courses ?? [];
    return new Set(assigned.map((c) => c.id).filter(Boolean));
  };

  const handleViewAsInstructor = (instructor: InstructorWithCourses) => {
    const displayName = instructor.name || instructor.email || "";

    const started = startAdminViewAs({
      viewAsRole: "instructor",
      viewAsName: displayName || "Instructor",
      viewAsEmail: instructor.email ?? null,
      returnPath: "/dashboard/instructors",
    });

    if (!started) {
      toast({
        variant: "destructive",
        title: "Could not switch view",
        description: "You do not have permission to preview as this instructor.",
        duration: 4000,
      });
      return;
    }

    toast({
      variant: "success" as any,
      title: "Switched to instructor view",
      description: `You are now viewing the dashboard as ${displayName || "this instructor"}.`,
      duration: 4000,
    });

    navigate("/dashboard/instructor");
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const data = await getCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Unable to load courses. Please try again later.";
      toast({
        variant: "destructive",
        title: "Error loading courses",
        description: message,
        duration: 4000,
      });
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleOpenCoursesDialog = async (instructor: InstructorWithCourses) => {
    setSelectedInstructor(instructor);
    setCoursesDialogOpen(true);
    setCourseSearch("");
    await loadCourses();
  };

  const refreshSelectedInstructor = async () => {
    invalidateDashboardCache("instructors-with-courses");
    const fresh = await getInstructorsWithCourses();
    const list = Array.isArray(fresh) ? fresh : [];
    if (selectedInstructor?.id) {
      const updated = list.find((i) => i.id === selectedInstructor.id) as InstructorWithCourses | undefined;
      if (updated) {
        setSelectedInstructor(updated);
      }
    }
    await reloadInstructors();
  };

  const handleAssignCourseToInstructor = async (course: CourseRow) => {
    if (!selectedInstructor?.id || !course.id) return;
    try {
      setAssigningCourseId(course.id);
      await assignCourseToUser(course.id, selectedInstructor.id);
      toast({
        variant: "success" as any,
        title: "Course assigned",
        description: `"${course.title}" assigned to ${selectedInstructor.name}.`,
        duration: 4000,
      });
      await refreshSelectedInstructor();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to assign course to instructor.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setAssigningCourseId(null);
    }
  };

  const handleUnassignCourseFromInstructor = async (course: CourseRow) => {
    if (!selectedInstructor?.id || !course.id) return;
    try {
      setUnassigningCourseId(course.id);
      await unassignCourseFromUser(course.id, selectedInstructor.id);
      toast({
        variant: "success" as any,
        title: "Course unassigned",
        description: `"${course.title}" removed from ${selectedInstructor.name}.`,
        duration: 4000,
      });
      await refreshSelectedInstructor();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to unassign course.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
        duration: 4000,
      });
    } finally {
      setUnassigningCourseId(null);
    }
  };

  const assignedCourseIds = useMemo(
    () => getInstructorAssignedIds(selectedInstructor),
    [selectedInstructor]
  );

  const filteredInstructors = useMemo(
    () =>
      filterBySmartSearch(instructors, search, (inst) => {
        const assigned = inst.assigned_courses ?? inst.assignedCourses ?? [];
        return [
          inst.name,
          inst.email,
          inst.status,
          inst.role,
          ...assigned.map((c) => c.title),
          ...assigned.map((c) => c.status),
        ];
      }),
    [instructors, search]
  );

  const filteredCourses = useMemo(
    () =>
      filterBySmartSearch(courses, courseSearch, (course) => [
        course.title,
        course.description,
        course.status,
        course.category,
        course.level,
      ]),
    [courses, courseSearch]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Instructor Management</h1>
            <p className="text-sm text-muted-foreground">
              View instructors, assign courses, and switch to their instructor dashboard.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading || refreshing}
            onClick={() => reloadInstructors()}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="default" className="gap-2" onClick={() => { resetCreateForm(); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add instructor
          </Button>
        </div>
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create instructor</DialogTitle>
              <DialogDescription>
                Add a new instructor account. They can log in with the email and password below, then you can assign courses.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateInstructor}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="inst-first">First name *</Label>
                  <Input
                    id="inst-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inst-last">Last name</Label>
                  <Input
                    id="inst-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-email">Email *</Label>
                <Input
                  id="inst-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="instructor@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-phone">Phone</Label>
                <Input
                  id="inst-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-password">Temporary password</Label>
                <Input
                  id="inst-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12345678"
                />
                <p className="text-xs text-muted-foreground">Share this with the instructor for their first login.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inst-status">Status</Label>
                <select
                  id="inst-status"
                  className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending (awaiting approval)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    "Create instructor"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit instructor</DialogTitle>
            <DialogDescription>Update instructor details. Leave password blank to keep the current one.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveInstructorEdit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-inst-first">First name *</Label>
                <Input
                  id="edit-inst-first"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-inst-last">Last name</Label>
                <Input
                  id="edit-inst-last"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inst-email">Email *</Label>
              <Input
                id="edit-inst-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inst-phone">Phone</Label>
              <Input
                id="edit-inst-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inst-password">New password (optional)</Label>
              <Input
                id="edit-inst-password"
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inst-status">Status</Label>
              <select
                id="edit-inst-status"
                className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending (awaiting approval)</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <CardTitle className="text-lg font-semibold">Instructors</CardTitle>
          <SmartSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, status, assigned course…"
            resultCount={filteredInstructors.length}
            totalCount={instructors.length}
            className="w-full md:w-80"
          />
        </CardHeader>
        <CardContent>
          {loading && instructors.length === 0 ? (
            <TableSkeleton rows={8} cols={5} />
          ) : filteredInstructors.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">No instructors found.</p>
              <Button variant="outline" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create your first instructor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border border-border rounded-md">
                <TableHeader>
                  <TableRow className="border-b border-border text-xs text-muted-foreground bg-muted/40">
                    <TableHead className="w-[40px] text-center">#</TableHead>
                    <TableHead className="w-[220px]">Instructor</TableHead>
                    <TableHead className="w-[220px]">Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Courses</TableHead>
                    <TableHead className="w-[300px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstructors.map((inst, index) => {
                    const courses = inst.assignedCourses || inst.assigned_courses || [];
                    return (
                      <TableRow key={inst.id} className="border-b border-border last:border-0 align-top">
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{inst.name}</TableCell>
                        <TableCell className="text-muted-foreground">{inst.email ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={inst.status?.toLowerCase() === "inactive" ? "outline" : "default"}>
                            {inst.status ?? "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {courses.length === 0 ? (
                            <span>No courses assigned.</span>
                          ) : (
                            <ul className="list-disc list-inside space-y-1">
                              {courses.map((course) => (
                                <li key={course.id}>
                                  <span className="text-foreground font-medium">{course.title ?? "Untitled course"}</span>
                                  {course.status && (
                                    <span className="ml-1 text-xs text-muted-foreground">({course.status})</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => handleOpenCoursesDialog(inst)}
                            >
                              Manage courses
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEditDialog(inst)}
                              title="Edit instructor"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteInstructor(inst)}
                              disabled={deletingId === inst.id}
                              title="Delete instructor"
                            >
                              {deletingId === inst.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => handleViewAsInstructor(inst)}
                              title="View as instructor"
                            >
                              <ArrowRightCircle className="w-4 h-4 mr-1" />
                              View as
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={coursesDialogOpen}
        onOpenChange={(open) => {
          setCoursesDialogOpen(open);
          if (!open) {
            setSelectedInstructor(null);
            setCourseSearch("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Courses</DialogTitle>
            <DialogDescription>
              {selectedInstructor
                ? `Assign or unassign courses for ${selectedInstructor.name}.`
                : "Select an instructor to manage courses."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            <SmartSearchInput
              value={courseSearch}
              onChange={setCourseSearch}
              placeholder="Search course title, description, status…"
              resultCount={filteredCourses.length}
              totalCount={courses.length}
            />
            {coursesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading courses...</span>
              </div>
            ) : filteredCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="border border-border rounded-md">
                  <TableHeader>
                    <TableRow className="border-b border-border text-xs text-muted-foreground bg-muted/40">
                      <TableHead className="w-[40px] text-center">#</TableHead>
                      <TableHead className="w-[220px]">Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[110px]">Status</TableHead>
                      <TableHead className="w-[140px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course, index) => {
                      const shortDescription = (course.description ?? "").slice(0, 80) +
                        ((course.description ?? "").length > 80 ? "..." : "");
                      const status = course.status ?? "Active";
                      const isInactive = status.toLowerCase() === "inactive";
                      const isAssigned = course.id ? assignedCourseIds.has(course.id) : false;
                      const isBusy =
                        course.id &&
                        (assigningCourseId === course.id || unassigningCourseId === course.id);
                      return (
                        <TableRow key={course.id ?? course.title} className="border-b border-border last:border-0">
                          <TableCell className="text-center text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{course.title}</TableCell>
                          <TableCell className="text-muted-foreground max-w-xs whitespace-normal">
                            {shortDescription}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isInactive ? "outline" : "default"}>{status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {isAssigned ? (
                              <div className="flex items-center justify-center gap-2">
                                <Badge variant="secondary">Assigned</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3"
                                  onClick={() => handleUnassignCourseFromInstructor(course)}
                                  disabled={!selectedInstructor || !!isBusy}
                                >
                                  {unassigningCourseId === course.id ? (
                                    <span className="flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Removing…</span>
                                    </span>
                                  ) : (
                                    "Unassign"
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => handleAssignCourseToInstructor(course)}
                                disabled={!selectedInstructor || !course.id || !!isBusy}
                              >
                                {assigningCourseId === course.id ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Assigning...</span>
                                  </span>
                                ) : (
                                  "Assign"
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorManagement;
