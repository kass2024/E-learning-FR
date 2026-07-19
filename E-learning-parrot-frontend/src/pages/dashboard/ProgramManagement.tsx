import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import {
  assignCoursesToProgram,
  autoAssignCoursesToPrograms,
  createLearningProgram,
  deleteLearningProgram,
  getCourses,
  getLearningPrograms,
  moveCourseToProgram,
  updateLearningProgram,
  type CoursePayload,
  type LearningProgramPayload,
} from "@/api/axios";
import { ArrowRightLeft, FolderOpen, Loader2, Pencil, Plus, Trash2, Wand2 } from "lucide-react";

const ProgramManagement = () => {
  const { toast } = useToast();
  const {
    data: programsData,
    loading,
    reload,
  } = useDashboardQuery<LearningProgramPayload[]>("learning-programs-list", () =>
    getLearningPrograms({ withCourses: true })
  );
  const { data: coursesData, loading: coursesLoading, reload: reloadCourses } = useDashboardQuery<
    CoursePayload[]
  >("courses-list", getCourses);

  const programs = Array.isArray(programsData) ? programsData : [];
  const allCourses = Array.isArray(coursesData) ? coursesData : [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LearningProgramPayload | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [manageProgram, setManageProgram] = useState<LearningProgramPayload | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [movingCourseId, setMovingCourseId] = useState<number | null>(null);
  const [courseTableSearch, setCourseTableSearch] = useState("");

  const refresh = async () => {
    invalidateDashboardCache("learning-programs-list");
    invalidateDashboardCache("courses-list");
    invalidateDashboardCache("courses-list");
    await Promise.all([reload(), reloadCourses()]);
  };

  const filteredManageCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return allCourses;
    return allCourses.filter((c) => {
      const title = (c.title ?? "").toLowerCase();
      const code = (c.course_code ?? "").toLowerCase();
      const program = (c.program?.name ?? "").toLowerCase();
      return title.includes(q) || code.includes(q) || program.includes(q);
    });
  }, [allCourses, courseSearch]);

  const filteredAssignmentCourses = useMemo(() => {
    const q = courseTableSearch.trim().toLowerCase();
    if (!q) return allCourses;
    return allCourses.filter((c) => {
      const title = (c.title ?? "").toLowerCase();
      const code = (c.course_code ?? "").toLowerCase();
      const program = (c.program?.name ?? "").toLowerCase();
      return title.includes(q) || code.includes(q) || program.includes(q);
    });
  }, [allCourses, courseTableSearch]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStatus("Active");
    setSortOrder("0");
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (program: LearningProgramPayload) => {
    setEditing(program);
    setName(program.name);
    setDescription(program.description ?? "");
    setStatus(program.status ?? "Active");
    setSortOrder(String(program.sort_order ?? 0));
    setDialogOpen(true);
  };

  const openManageCourses = (program: LearningProgramPayload) => {
    setManageProgram(program);
    const inProgram = (program.courses ?? []).map((c) => c.id).filter((id): id is number => id != null);
    setSelectedCourseIds(inProgram);
    setCourseSearch("");
  };

  const toggleCourseSelection = (courseId: number, checked: boolean) => {
    setSelectedCourseIds((prev) =>
      checked ? [...new Set([...prev, courseId])] : prev.filter((id) => id !== courseId)
    );
  };

  const handleAssignCourses = async () => {
    if (!manageProgram?.id) return;
    setAssigning(true);
    try {
      const result = await assignCoursesToProgram(manageProgram.id, selectedCourseIds);
      toast({
        title: "Courses updated",
        description: result.message,
      });
      setManageProgram(null);
      await refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Could not assign courses.",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssign = async () => {
    if (
      !window.confirm(
        "Auto-assign courses to programs using keyword rules from the server config?\n\nCourses already in the right program are skipped unless you choose to force remap."
      )
    ) {
      return;
    }
    const force = window.confirm("Force remap ALL courses (including those already assigned)?\n\nOK = yes, Cancel = only unassigned courses");
    setAutoAssigning(true);
    try {
      const result = await autoAssignCoursesToPrograms({ createMissing: true, force });
      toast({
        title: result.assigned > 0 ? "Auto-assign complete" : "Nothing to change",
        description: result.message,
      });
      await refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Auto-assign failed.",
      });
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleMoveCourse = async (courseId: number, programId: number) => {
    if (!programId) return;
    setMovingCourseId(courseId);
    try {
      await moveCourseToProgram(courseId, programId);
      toast({ title: "Course moved", description: "Program assignment updated." });
      await refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Could not move course.",
      });
    } finally {
      setMovingCourseId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Enter a program name." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        sort_order: parseInt(sortOrder, 10) || 0,
      };

      if (editing?.id) {
        await updateLearningProgram(editing.id, payload);
        toast({ title: "Program updated", description: `"${name}" was saved.` });
      } else {
        await createLearningProgram(payload);
        toast({ title: "Program created", description: `"${name}" is ready for courses.` });
      }

      setDialogOpen(false);
      resetForm();
      await refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Could not save program.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (program: LearningProgramPayload) => {
    if (!program.id) return;
    if (!window.confirm(`Delete program "${program.name}"? This only works when no courses are assigned.`)) {
      return;
    }

    setDeletingId(program.id);
    try {
      await deleteLearningProgram(program.id);
      toast({ title: "Program deleted" });
      await refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: error?.response?.data?.message || "Failed to delete program.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Learning"
        title="Programs"
        description="Create programs and move existing courses into them from the UI."
      >
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" onClick={handleAutoAssign} disabled={autoAssigning} className="gap-2">
            {autoAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Auto-assign
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New program
          </Button>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            All programs
          </CardTitle>
          <CardDescription>
            Use &quot;Manage courses&quot; to move courses into each program.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton columns={5} rows={4} />
          ) : programs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No programs yet</p>
              <p className="text-sm mt-1">Create your first program, then add courses under it.</p>
              <Button className="mt-4" onClick={openCreate}>
                Create program
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{program.name}</p>
                        {program.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{program.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(program.courses ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">No courses</span>
                        ) : (
                          program.courses!.slice(0, 4).map((c) => (
                            <Badge key={c.id} variant="secondary" className="text-xs">
                              {c.title}
                            </Badge>
                          ))
                        )}
                        {(program.courses?.length ?? 0) > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{(program.courses?.length ?? 0) - 4} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={program.status === "Active" ? "default" : "secondary"}>
                        {program.status ?? "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{program.sort_order ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openManageCourses(program)}>
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                          Manage courses
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(program)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={deletingId === program.id}
                          onClick={() => handleDelete(program)}
                        >
                          {deletingId === program.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Move courses</CardTitle>
          <CardDescription>
            Change a course&apos;s program with the dropdown. Changes save immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-sm">
            <SmartSearchInput
              value={courseTableSearch}
              onChange={setCourseTableSearch}
              placeholder="Search courses…"
            />
          </div>
          {coursesLoading ? (
            <TableSkeleton columns={4} rows={5} />
          ) : filteredAssignmentCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Current program</TableHead>
                  <TableHead>Move to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignmentCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {course.course_code ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.program?.name ?? "Unassigned"}</Badge>
                    </TableCell>
                    <TableCell>
                      <select
                        className="flex h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
                        value={course.program_id ?? course.program?.id ?? ""}
                        disabled={!course.id || movingCourseId === course.id}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          if (course.id && next) handleMoveCourse(course.id, next);
                        }}
                      >
                        <option value="" disabled>
                          Select program
                        </option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit program" : "Create program"}</DialogTitle>
              <DialogDescription>
                Programs group related courses — e.g. &quot;Language&quot; with TCF, IELTS, and Business English.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="program-name">Name *</Label>
                <Input
                  id="program-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Language"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-desc">Description</Label>
                <Textarea
                  id="program-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of this program"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="program-status">Status</Label>
                  <select
                    id="program-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-order">Sort order</Label>
                  <Input
                    id="program-order"
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Save changes" : "Create program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageProgram} onOpenChange={(open) => !open && setManageProgram(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage courses — {manageProgram?.name}</DialogTitle>
            <DialogDescription>
              Select courses to include in this program. Checked courses will be moved here; unchecked
              courses already in this program will stay in their current program unless you move them from
              the table below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SmartSearchInput
              value={courseSearch}
              onChange={setCourseSearch}
              placeholder="Search courses…"
            />
          </div>
          <div className="flex-1 overflow-y-auto border rounded-md divide-y min-h-[200px] max-h-[360px]">
            {coursesLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : filteredManageCourses.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No courses match your search.</p>
            ) : (
              filteredManageCourses.map((course) => {
                const id = course.id!;
                const checked = selectedCourseIds.includes(id);
                const currentProgram = course.program?.name ?? "Unassigned";
                return (
                  <label
                    key={id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleCourseSelection(id, v === true)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Currently: {currentProgram}
                        {course.course_code ? ` · ${course.course_code}` : ""}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageProgram(null)}>
              Cancel
            </Button>
            <Button onClick={handleAssignCourses} disabled={assigning || selectedCourseIds.length === 0}>
              {assigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign {selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramManagement;
