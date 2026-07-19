import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Users, Clock, Filter } from "lucide-react";
import { getLearningPrograms, type LearningProgramPayload } from "@/api/axios";
import { getCourseImage } from "@/lib/apiConfig";
import { DEFAULT_IMAGES } from "@/lib/defaultImages";
import { SafeImage } from "@/components/ui/SafeImage";

const Courses = () => {
  const [programs, setPrograms] = useState<LearningProgramPayload[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | "all">("all");
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const navigate = useNavigate();

  const allCourses = programs.flatMap((p) =>
    (p.courses ?? [])
      .filter((c) => (c.status ?? "Active").toLowerCase() === "active")
      .map((c) => ({ ...c, programName: p.name, programId: p.id }))
  );

  const courses =
    selectedProgramId === "all"
      ? allCourses
      : allCourses.filter((c) => c.programId === selectedProgramId);

  const categories = ["All", "English", "French", "Kinyarwanda"];
  const levels = ["All Levels", "Beginner", "Intermediate", "Advanced"];

  const persistSelectedCourses = (primaryCourse: any, additionalCourses: any[] = []) => {
    try {
      const allCourses: any[] = [];

      const pushUnique = (c: any) => {
        if (!c || typeof c !== "object") return;
        const id = (c as any).id;
        if (id == null) return;
        if (!allCourses.some((x) => x.id === id)) {
          allCourses.push({
            id: c.id,
            title: c.title,
            programId: (c as any).programId ?? (c as any).program_id ?? null,
            programName: (c as any).programName ?? null,
            price: c.price ?? null,
            duration: c.duration ?? null,
          });
        }
      };

      pushUnique(primaryCourse);
      additionalCourses.forEach(pushUnique);

      if (allCourses.length === 0) return;

      window.localStorage.setItem("xander_selected_course", JSON.stringify(allCourses[0]));
      window.localStorage.setItem("xander_selected_courses", JSON.stringify(allCourses));
    } catch (e) {
      console.error("Failed to persist selected courses", e);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getLearningPrograms({ activeOnly: true, withCourses: true });
        setPrograms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load programs", error);
        setPrograms([]);
      }
    };

    load();
  }, []);

  const handleEnrollClick = (course: any) => {
    try {
      const payload = {
        id: course.id,
        title: course.title,
        price: course.price ?? null,
        duration: course.duration ?? null,
      };
      window.localStorage.setItem("xander_selected_course", JSON.stringify(payload));
      window.localStorage.setItem("xander_selected_courses", JSON.stringify([payload]));
    } catch (e) {
      console.error("Failed to persist selected course", e);
    }

    navigate("/signup");
  };

  const toggleCourseSelection = (course: any) => {
    if (!course || course.id == null) return;
    setSelectedCourseIds((prev) => {
      if (prev.includes(course.id)) {
        return prev.filter((id) => id !== course.id);
      }
      return [...prev, course.id];
    });
  };

  const handleContinueWithSelected = () => {
    const selected = courses.filter((c) => selectedCourseIds.includes(c.id));
    if (selected.length === 0) return;

    const primary = selected[0];
    const additional = selected.slice(1);
    persistSelectedCourses(primary, additional);
    navigate("/signup");
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="public-page-offset pb-16 px-4 bg-gradient-to-b from-[#EAF7F0] via-white to-white border-b border-border">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#0B0B0B]">
              Choose the language
              <span className="text-primary"> you want to learn</span>
            </h1>
            <p className="text-lg md:text-xl text-[#0B0B0B]/65 mb-8">
              English, French, and Kinyarwanda — expert-led online courses for real-life fluency.
            </p>

            {/* Search Bar */}
            <div className="flex gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search English, French, Kinyarwanda..."
                  className="pl-10 h-12 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 rounded-full"
                />
              </div>
              <Button
                variant="default"
                size="lg"
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Courses � white background */}
      <section className="py-12 px-4 bg-white">
        <div className="container mx-auto">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-5 h-5 text-primary" />
              <span className="font-medium">
                Showing {courses.length} course{courses.length !== 1 ? "s" : ""}
                {selectedProgramId !== "all" && programs.find((p) => p.id === selectedProgramId)
                  ? ` in ${programs.find((p) => p.id === selectedProgramId)?.name}`
                  : ""}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedProgramId === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedProgramId("all")}
              >
                All programs
              </Button>
              {(programs ?? []).map((p) => (
                <Button
                  key={p.id}
                  variant={selectedProgramId === p.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => p.id && setSelectedProgramId(p.id)}
                >
                  {p.name}
                </Button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200 text-slate-800">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select defaultValue="all-levels">
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200 text-slate-800">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level.toLowerCase().replace(" ", "-")}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select defaultValue="popular">
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200 text-slate-800">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <Card
                key={course.id ?? course.title}
                className="overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-2 cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden">
                  <SafeImage
                    src={getCourseImage(course.title, course.image)}
                    fallback={DEFAULT_IMAGES.course}
                    alt={course.title}
                    className="w-full h-full transition-transform duration-300 hover:scale-110"
                  />
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                    {course.category || course.status || "Zoom Program"}
                  </Badge>
                  <Badge className="absolute top-4 right-4 bg-[#1F8A4C] text-[#1F8A4C]">
                    {(course as any).level || "All Levels"}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-2 hover:text-primary transition-colors text-slate-900">
                    {course.title}
                  </CardTitle>
                  {(course as any).programName && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {(course as any).programName}
                    </Badge>
                  )}
                  {course.description && (
                    <CardDescription className="text-sm text-slate-600 line-clamp-2">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant={selectedCourseIds.includes(course.id) ? "default" : "outline"}
                      size="sm"
                      className={
                        selectedCourseIds.includes(course.id)
                          ? "rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4"
                          : "rounded-full border-primary text-primary hover:bg-accent/20 px-4"
                      }
                      type="button"
                      onClick={() => toggleCourseSelection(course)}
                    >
                      {selectedCourseIds.includes(course.id) ? "Selected" : "Select"}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="rounded-full bg-[#1F8A4C] hover:bg-[#E6B000] text-[#1F8A4C] font-semibold"
                      onClick={() => handleEnrollClick(course)}
                    >
                      Enroll & Sign Up
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedCourseIds.length > 1 && (
            <div className="flex justify-center mt-10">
              <Button
                variant="default"
                size="lg"
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 shadow-lg shadow-primary/30"
                onClick={handleContinueWithSelected}
              >
                Continue with Selected Courses to Apply
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Courses;
