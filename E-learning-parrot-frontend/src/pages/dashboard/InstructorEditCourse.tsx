import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getInstructorAssignedCourses,
  updateInstructorCourse,
  getLearningPrograms,
  type CoursePayload,
  type LearningProgramPayload,
} from "@/api/axios";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CourseDetailsFormFields } from "@/components/courses/CourseDetailsFormFields";
import { courseDetailsFromCourse, type CourseDetailsFields } from "@/lib/courseDetails";
import { dashboardCacheKey, getInstructorEmail } from "@/lib/dashboardUser";
import { invalidateDashboardCache } from "@/lib/dashboardCache";

const TAB_CLASS =
  "data-[state=active]:bg-[#0070D0] data-[state=active]:text-white rounded-lg text-sm";

const InstructorEditCourse = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const parsedId = Number(courseId);
  const email = getInstructorEmail() ?? "";

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [requirements, setRequirements] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [programs, setPrograms] = useState<LearningProgramPayload[]>([]);
  const [details, setDetails] = useState<CourseDetailsFields>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLearningPrograms({ activeOnly: false })
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  useEffect(() => {
    if (!email || !parsedId || Number.isNaN(parsedId)) {
      setLoading(false);
      return;
    }

    getInstructorAssignedCourses(email)
      .then((res) => {
        const course = (res.courses ?? []).find((c: CoursePayload) => c.id === parsedId);
        if (!course) {
          toast({ variant: "destructive", title: "Course not found" });
          navigate("/dashboard/my-courses");
          return;
        }
        setTitle(course.title ?? "");
        setDescription(course.description ?? "");
        setPrice(course.price != null ? String(course.price) : "");
        setDuration(course.duration ?? "");
        setRequirements(course.requirements ?? "");
        setProgramId(course.program_id ?? course.program?.id ?? null);
        setDetails(courseDetailsFromCourse(course));
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Could not load course" });
        navigate("/dashboard/my-courses");
      })
      .finally(() => setLoading(false));
  }, [email, parsedId, navigate, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !parsedId || Number.isNaN(parsedId)) return;

    setSaving(true);
    try {
      await updateInstructorCourse(parsedId, {
        instructor_email: email,
        program_id: programId ?? undefined,
        title: title.trim(),
        description: description || undefined,
        price: price ? parseFloat(price) : undefined,
        duration: duration || undefined,
        requirements: requirements || undefined,
        course_code: details.course_code || undefined,
        general_information: details.general_information || undefined,
        important_information: details.important_information || undefined,
        guidelines: details.guidelines,
        how_to_use: details.how_to_use,
        attendance_policy: details.attendance_policy || undefined,
        assessment_policy: details.assessment_policy || undefined,
        auto_generate_code: !details.course_code,
      });
      invalidateDashboardCache(dashboardCacheKey("instructor-courses", email));
      invalidateDashboardCache(dashboardCacheKey("instructor-dashboard", email));
      toast({ title: "Course updated" });
      navigate("/dashboard/my-courses");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Error", description: message || "Could not update course." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#0070D0]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-4xl">
      <AdminPageHeader eyebrow="Teaching" title="Edit Course" description={title || "Update course details."} />

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-[#0070D0]/10">
        <div className="h-1 bg-gradient-to-r from-[#0070D0] via-[#1A8AD8] to-[#FCC400]" />
        <CardHeader className="border-b border-[#0070D0]/10 bg-[#0070D0]/[0.03] pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-[#0070D0]">
            <BookOpen className="h-5 w-5" />
            Course builder
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basics" className="space-y-5">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60 p-1">
                <TabsTrigger value="basics" className={TAB_CLASS}>
                  Basics
                </TabsTrigger>
                <TabsTrigger value="guide" className={TAB_CLASS}>
                  Learner guide
                </TabsTrigger>
                <TabsTrigger value="policies" className={TAB_CLASS}>
                  Policies
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="program">Program *</Label>
                  <select
                    id="program"
                    className="flex h-11 w-full rounded-md border border-[#0070D0]/15 bg-background px-3 text-sm"
                    value={programId ?? ""}
                    onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : null)}
                    required
                  >
                    <option value="">Select program</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    className="h-11 border-[#0070D0]/15"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Short description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="border-[#0070D0]/15 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-11 border-[#0070D0]/15"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      className="h-11 border-[#0070D0]/15"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={2}
                    className="border-[#0070D0]/15 resize-none"
                  />
                </div>
                <CourseDetailsFormFields
                  value={details}
                  onChange={setDetails}
                  courseTitle={title}
                  showCode
                  section="code"
                />
              </TabsContent>

              <TabsContent value="guide" className="mt-0">
                <CourseDetailsFormFields
                  value={details}
                  onChange={setDetails}
                  courseTitle={title}
                  showCode={false}
                  section="guide"
                />
              </TabsContent>

              <TabsContent value="policies" className="mt-0">
                <CourseDetailsFormFields
                  value={details}
                  onChange={setDetails}
                  courseTitle={title}
                  showCode={false}
                  section="policies"
                />
              </TabsContent>
            </Tabs>

            <div className="mt-8 flex flex-col-reverse gap-2 border-t border-[#0070D0]/10 pt-6 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => navigate("/dashboard/my-courses")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#0070D0] hover:bg-[#1A8AD8] h-11 px-6">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorEditCourse;
