import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, CheckCircle } from "lucide-react";
import { getCourses, updateCourse } from "@/api/axios";

interface Course {
  id: number;
  title: string;
  level?: string;
  [key: string]: any;
}

const LEVELS = [
  { id: "beginner", label: "1. Beginner" },
  { id: "elementary", label: "2. Elementary" },
  { id: "intermediate", label: "3. Intermediate" },
  { id: "upper_intermediate", label: "4. Upper Intermediate" },
  { id: "advanced", label: "5. Advanced" },
  { id: "upper_advanced", label: "6. Upper Advanced" },
];

const TARGET_COURSES = [2, 3]; // Course IDs for which we want to manage levels

export default function CourseLevelManagement() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getCourses();
      const targetCourses = Array.isArray(data) 
        ? data.filter(course => TARGET_COURSES.includes(course.id))
        : [];
      setCourses(targetCourses);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading courses",
        description: error?.response?.data?.message || "Failed to load courses",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleLevelChange = async (courseId: number, level: string) => {
    try {
      setSaving(prev => ({ ...prev, [courseId]: true }));
      
      await updateCourse(courseId, { level });
      
      setCourses(prev =>
        prev.map(course =>
          course.id === courseId ? { ...course, level } : course
        )
      );
      
      toast({
        title: "Success",
        description: `Course level updated successfully`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating course level",
        description: error?.response?.data?.message || "Failed to update course level",
      });
    } finally {
      setSaving(prev => ({ ...prev, [courseId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Course Level Management</h2>
          <p className="text-muted-foreground">
            Set English proficiency levels for Course 2 and Course 3
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden">
            <CardHeader className="bg-secondary/50">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl">{course.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Current Level:</h3>
                  <div className="text-lg font-semibold text-primary">
                    {course.level ? 
                      LEVELS.find(l => l.id === course.level)?.label || 'Not set' : 
                      'Not set'}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Set New Level:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVELS.map((level) => (
                      <Button
                        key={`${course.id}-${level.id}`}
                        variant={course.level === level.id ? 'default' : 'outline'}
                        size="sm"
                        className="justify-start text-left h-auto py-2"
                        onClick={() => handleLevelChange(course.id, level.id)}
                        disabled={saving[course.id]}
                      >
                        {saving[course.id] && course.level === level.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : course.level === level.id ? (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        ) : null}
                        {level.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
