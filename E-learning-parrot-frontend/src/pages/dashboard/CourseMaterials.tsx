"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import {
  Loader2,
  FileText,
  UploadCloud,
  Radio,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/components/ui/use-toast";
import {
  deleteCourseMaterial,
  getCourseMaterials,
  getInstructorAssignedCourses,
  getInstructorsWithCourses,
  uploadCourseMaterialDirectPCloud,
  type LearnerCourseMaterial,
} from "@/api/axios";
import { fetchDashboardCached } from "@/lib/dashboardCache";
import { LiveClassRecordingCard } from "@/components/materials/LiveClassRecordingCard";
import { MaterialUploadZone } from "@/components/materials/MaterialUploadZone";
import { MaterialFilesBrowser } from "@/components/materials/MaterialFilesBrowser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, UserRound, FolderOpen } from "lucide-react";
import ParrotLogo from "@/components/ParrotLogo";
import { isFileMaterial } from "@/lib/materialFileUtils";

// Course interface
interface Course {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
}

type InstructorRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  assigned_courses?: Course[];
};

export default function CourseMaterials() {
  const { toast } = useToast();
  const isAdmin =
    typeof window !== "undefined" &&
    (localStorage.getItem("parrot_user_role") === "admin" ||
      localStorage.getItem("parrot_user_role") === "staff");

  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | "all">("all");

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [mainTab, setMainTab] = useState<"files" | "content" | "recordings">("files");
  const [apiMaterials, setApiMaterials] = useState<LearnerCourseMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const selectedCourseIdRef = useRef<number | null>(selectedCourseId);
  selectedCourseIdRef.current = selectedCourseId;

  const loadCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);

    try {
      if (isAdmin) {
        const { data } = await fetchDashboardCached("instructors-with-courses", getInstructorsWithCourses);
        const list = Array.isArray(data) ? data : [];
        setInstructors(list);

        const courseMap = new Map<number, Course>();
        for (const instructor of list) {
          for (const course of instructor.assigned_courses ?? instructor.assignedCourses ?? []) {
            if (course?.id) courseMap.set(course.id, course);
          }
        }
        const allCourses = Array.from(courseMap.values());
        setCourses(allCourses);
        if (!selectedCourseId && allCourses.length > 0) {
          setSelectedCourseId(allCourses[0].id);
        }
        return;
      }

      const email = localStorage.getItem("parrot_user_email") ?? "";
      const res = await getInstructorAssignedCourses(email);
      const list = Array.isArray(res?.courses) ? res.courses : [];
      setCourses(list);
      if (!selectedCourseId && list.length > 0) {
        setSelectedCourseId(list[0].id);
      }
    } catch (e: any) {
      setCoursesError(e?.response?.data?.message || e.message || "Unable to load courses");
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const visibleCourses = useMemo(() => {
    if (!isAdmin || selectedInstructorId === "all") return courses;
    const instructor = instructors.find((i) => i.id === selectedInstructorId);
    return instructor?.assigned_courses ?? [];
  }, [courses, instructors, isAdmin, selectedInstructorId]);

  useEffect(() => {
    if (!visibleCourses.length) return;
    if (!selectedCourseId || !visibleCourses.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(visibleCourses[0].id);
    }
  }, [visibleCourses, selectedCourseId]);

  const loadApiMaterials = async (courseId: number, includeRecordings = false) => {
    setMaterialsLoading(true);
    try {
      const res = await getCourseMaterials(courseId, { includeRecordings });
      setApiMaterials((current) => {
        if (selectedCourseIdRef.current !== courseId) return current;
        return res.materials ?? [];
      });
    } catch (e: any) {
      if (!includeRecordings) setApiMaterials([]);
      toast({
        variant: "destructive",
        title: "Could not load materials",
        description: e?.response?.data?.message || "Unable to fetch course materials from the server.",
      });
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      setApiMaterials([]);
      loadApiMaterials(selectedCourseId, false);
    } else {
      setApiMaterials([]);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (mainTab === "recordings" && selectedCourseId) {
      loadApiMaterials(selectedCourseId, true);
    }
  }, [mainTab, selectedCourseId]);

  const brandGreen = "#0A0A0A";

  const fileMaterials = useMemo(
    () => apiMaterials.filter(isFileMaterial),
    [apiMaterials]
  );

  const liveRecordings = useMemo(() => {
    return apiMaterials.flatMap((material) => {
      if (material.kind !== "zoom" || !material.recordings?.length) return [];
      return material.recordings.map((recording, index) => ({
        recording,
        sessionTitle: material.title,
        key: `${material.id}-${recording.uuid ?? recording.id ?? index}`,
      }));
    });
  }, [apiMaterials]);

  const platformMaterials = useMemo(
    () => apiMaterials.filter((m) => m.kind !== "zoom" && !isFileMaterial(m)),
    [apiMaterials]
  );

  const handlePCloudUpload = async (files: File[], description?: string) => {
    if (!selectedCourseId) return;
    setUploading(true);
    let ok = 0;
    let fail = 0;

    for (const file of files) {
      setUploadingFileName(file.name);
      setUploadProgress(0);
      try {
        await uploadCourseMaterialDirectPCloud(selectedCourseId, file, {
          description,
          onProgress: setUploadProgress,
        });
        ok++;
      } catch (e: any) {
        fail++;
        toast({
          variant: "destructive",
          title: `Failed: ${file.name}`,
          description: e?.response?.data?.message || e.message,
        });
      }
    }

    setUploadProgress(null);
    setUploadingFileName(null);

    if (ok > 0) {
      toast({
        title: "Upload complete",
        description: `${ok} file(s) saved to pCloud${fail ? `, ${fail} failed` : ""}.`,
      });
      await loadApiMaterials(selectedCourseId);
    }

    setUploading(false);
  };

  const handleDeleteMaterial = async (material: LearnerCourseMaterial) => {
    const courseId = material.course_id ?? selectedCourseId;
    if (!courseId || !material.id) return;
    setDeletingId(material.id);
    try {
      await deleteCourseMaterial(courseId, material.id);
      toast({ title: "Deleted", description: `${material.title} removed from course materials.` });
      await loadApiMaterials(courseId);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e?.response?.data?.message || "Unable to delete this file.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">

      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-[#1A8AD8] to-[#0058A8] p-6 sm:p-8 shadow-strong">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <ParrotLogo size="lg" showRing={false} className="ring-2 ring-white/30 hidden sm:flex" />
            <div>
            <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white/80">F&R Rwanda Ltd</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Materials Dashboard</h1>
            <p className="text-white/80 text-sm sm:text-base">
              {isAdmin
                ? "Browse all instructor course materials and live class recordings."
                : "Manage materials for your assigned courses in a DataTable view."}
            </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => selectedCourseId && loadApiMaterials(selectedCourseId, mainTab === "recordings")}
            className="bg-white/10 border-white/25 text-white hover:bg-white/20"
          >
            <Loader2 className={`w-4 h-4 mr-2 ${materialsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Sidebar */}
        <Card className="shadow-sm h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base flex gap-2 items-center">
              <FolderOpen className="w-4 h-4 text-primary" />
              {isAdmin ? "Filter" : "My Courses"}
            </CardTitle>
            <CardDescription>
              {isAdmin ? "Filter by instructor and course" : "Select a course to manage files"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 max-h-[65vh] overflow-auto pr-2">
            {isAdmin && (
              <div className="space-y-2 pb-2 border-b">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" />
                  Instructor
                </Label>
                <Select
                  value={selectedInstructorId === "all" ? "all" : String(selectedInstructorId)}
                  onValueChange={(v) => setSelectedInstructorId(v === "all" ? "all" : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All instructors</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={String(instructor.id)}>
                        {instructor.name || instructor.email || `Instructor #${instructor.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              Course
            </Label>
            {coursesLoading && (
              <div className="text-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            )}

            {!coursesLoading && coursesError && (
              <div className="text-center py-4 text-red-500">{coursesError}</div>
            )}

            {!coursesLoading &&
              visibleCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`w-full px-4 py-3 text-sm rounded-lg text-left border transition
                    ${
                      selectedCourseId === course.id
                        ? "text-white border-transparent"
                        : "hover:bg-muted border"
                    }`}
                  style={
                    selectedCourseId === course.id
                      ? { backgroundColor: brandGreen }
                      : undefined
                  }
                >
                  <p className="font-medium">{course.title}</p>
                </button>
              ))}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">

          {/* Upload Section */}
          <Card className="p-4 sm:p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                Upload Materials
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Files upload to pCloud folder #31887143130 — only metadata is saved in the LMS.
              </p>
            </div>
            <MaterialUploadZone
              disabled={!selectedCourseId}
              uploading={uploading}
              uploadProgress={uploadProgress}
              uploadingFileName={uploadingFileName}
              onUpload={handlePCloudUpload}
            />
          </Card>

          {/* Materials tabs */}
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "files" | "content" | "recordings")}>
            <TabsList className={`grid w-full max-w-2xl ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
              <TabsTrigger value="files" className="gap-2">
                <UploadCloud className="h-4 w-4" />
                Course files ({fileMaterials.length})
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="content" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Course content ({platformMaterials.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="recordings" className="gap-2">
                <Radio className="h-4 w-4" />
                Live recordings ({liveRecordings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="mt-4">
              <Card className="p-6 shadow-sm">
                {selectedCourseId ? (
                  <MaterialFilesBrowser
                    courseId={selectedCourseId}
                    materials={fileMaterials}
                    loading={materialsLoading}
                    onDelete={handleDeleteMaterial}
                    deletingId={deletingId}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-12">Select a course to manage materials.</p>
                )}
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="content" className="mt-4">
                <Card className="p-6 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Platform course content
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Videos, documents, quizzes, and scheduled live classes stored in the LMS
                    </p>
                  </div>

                  {materialsLoading ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading course content...
                    </div>
                  ) : platformMaterials.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed">
                      No platform materials for this course yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {platformMaterials.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-white to-muted/20"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{item.title}</p>
                              <Badge variant="outline">{item.kind}</Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          {item.resource_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={item.resource_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Open
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            )}

            <TabsContent value="recordings" className="mt-4">
              <Card className="p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Radio className="w-5 h-5 text-sky-600" />
                    Live class recordings
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Cloud recordings from live classes you started for this course
                  </p>
                </div>

                {materialsLoading && liveRecordings.length === 0 && (
                  <div className="grid gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border p-4 animate-pulse bg-gradient-to-r from-[#0A0A0A]/5 to-[#FCC400]/5"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                        <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                        <div className="h-9 bg-muted rounded w-28" />
                      </div>
                    ))}
                  </div>
                )}

                {materialsLoading && liveRecordings.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
                    Refreshing recordings...
                  </div>
                )}

                {!materialsLoading && liveRecordings.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed">
                    <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No live class recordings yet.</p>
                    <p className="text-xs mt-1">Recordings appear here after you start a live class with cloud recording enabled.</p>
                  </div>
                )}

                {!materialsLoading && liveRecordings.length > 0 && (
                  <div className="grid gap-4">
                    {liveRecordings.map(({ recording, sessionTitle, key }) => (
                      <LiveClassRecordingCard
                        key={key}
                        recording={recording}
                        sessionTitle={sessionTitle}
                        compact
                      />
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
