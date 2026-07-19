import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useLearnerDashboardData } from "@/hooks/useLearnerDashboardData";

const LearnerProgress = () => {
  const navigate = useNavigate();
  const { data, loading } = useLearnerDashboardData();
  const courses = data?.enrolled_courses ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Learner"
        title="Progress Tracking"
        description="Monitor completion across HD lessons, quizzes, and live classes."
      />

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            Enroll in a course to start tracking your learning progress.
            <button className="block mx-auto mt-4 text-primary underline" onClick={() => navigate("/dashboard/learner")}>
              Browse courses
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <Badge variant="secondary">{course.status}</Badge>
                </div>
                <CardDescription>
                  {course.videos_count ?? 0} videos · {course.documents_count ?? 0} resources · {course.quizzes_count ?? 0} quizzes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <Progress value={course.progress_percent ?? 0} className="flex-1 h-3" />
                  <span className="text-sm font-semibold w-12 text-right">{course.progress_percent ?? 0}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearnerProgress;
