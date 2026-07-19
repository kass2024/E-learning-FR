import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** leaveUrl target for Zoom Client View after the user leaves a meeting. */
const MeetingEnded = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1a1a1a] px-6 text-center text-white">
    <h1 className="text-xl font-semibold">Meeting ended</h1>
    <p className="max-w-md text-sm text-zinc-400">You have left the Zoom session.</p>
    <div className="flex flex-wrap justify-center gap-2">
      <Button asChild className="bg-[#0e72ed] hover:bg-[#0b5fc7]">
        <Link to="/dashboard">Go to dashboard</Link>
      </Button>
      <Button asChild variant="outline" className="border-zinc-500 bg-transparent text-white hover:bg-zinc-800 hover:text-white">
        <Link to="/dashboard/learner/live-classes">Live classes</Link>
      </Button>
    </div>
  </div>
);

export default MeetingEnded;
