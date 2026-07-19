import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { openCourseMaterials } from "@/lib/learnerNavigation";

/** Legacy route — recordings live under paid course materials only. */
const LearnerRecordings = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const storedCourseId = Number(localStorage.getItem("parrot_selected_course_id"));
    if (storedCourseId && !Number.isNaN(storedCourseId)) {
      openCourseMaterials(navigate, storedCourseId, "recordings");
      return;
    }
    navigate("/dashboard/my-courses", { replace: true });
  }, [navigate]);

  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
};

export default LearnerRecordings;
