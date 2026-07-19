import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { consumeDailyReturnPath } from "@/components/live/DailyMeetingRoom";

/** Land here after leaving a Daily Prebuilt call (domain redirect_on_meeting_exit). */
const DailyReturn = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const path = consumeDailyReturnPath("/dashboard/live-zoom-cohort");
    navigate(path, { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a1a1a] text-zinc-200">
      <Loader2 className="h-8 w-8 animate-spin text-[#0e72ed]" />
      <p className="text-sm">Returning to F&R Rwanda…</p>
    </div>
  );
};

export default DailyReturn;
