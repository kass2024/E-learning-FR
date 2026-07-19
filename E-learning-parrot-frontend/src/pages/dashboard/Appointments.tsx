import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MeetingRegistrations, { type MeetingRegistrationRow } from "@/pages/dashboard/MeetingRegistrations";
import AvailableSchedules from "@/pages/dashboard/AvailableSchedules";
import {
  DASHBOARD_DATA_UPDATED_EVENT,
  readDashboardCache,
} from "@/lib/dashboardCache";
import { parseAvailableSchedulesResponse } from "@/lib/meetingScheduleUtils";

type RegistrationsBundle = {
  regs: unknown;
  schedules: unknown;
  status: unknown;
};

type AppointmentStats = {
  pending: number;
  approved: number;
  total: number;
  openSlots: number;
  loaded: boolean;
};

const EMPTY_STATS: AppointmentStats = {
  pending: 0,
  approved: 0,
  total: 0,
  openSlots: 0,
  loaded: false,
};

function extractRows(regs: unknown): MeetingRegistrationRow[] {
  if (Array.isArray(regs)) return regs as MeetingRegistrationRow[];
  const data = (regs as { data?: MeetingRegistrationRow[] })?.data;
  return Array.isArray(data) ? data : [];
}

function readStats(): AppointmentStats {
  const bundle = readDashboardCache<RegistrationsBundle>("meeting-registrations-bundle");
  if (!bundle) return EMPTY_STATS;

  const rows = extractRows(bundle.regs);
  const statusOf = (row: MeetingRegistrationRow) => (row.status || "pending").toLowerCase();

  return {
    pending: rows.filter((row) => statusOf(row) === "pending").length,
    approved: rows.filter((row) => statusOf(row) === "approved").length,
    total: rows.length,
    openSlots: parseAvailableSchedulesResponse(bundle.schedules).schedules.length,
    loaded: true,
  };
}

/**
 * Combined Appointments hub:
 * - Booking requests: approve / reschedule / start
 * - Availability: calendar slots learners can book
 */
const Appointments = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<AppointmentStats>(() => readStats());

  const refreshStats = useCallback(() => setStats(readStats()), []);

  useEffect(() => {
    // The embedded tabs fetch and cache the bundle; mirror it into the hero stats.
    window.addEventListener(DASHBOARD_DATA_UPDATED_EVENT, refreshStats);
    const interval = window.setInterval(refreshStats, 15_000);
    refreshStats();
    return () => {
      window.removeEventListener(DASHBOARD_DATA_UPDATED_EVENT, refreshStats);
      window.clearInterval(interval);
    };
  }, [refreshStats]);

  const tab = useMemo(() => {
    const raw = (searchParams.get("tab") || "").toLowerCase();
    if (raw === "availability" || raw === "schedules" || raw === "calendar") {
      return "availability";
    }
    if (raw === "bookings" || raw === "requests" || raw === "registrations") {
      return "bookings";
    }
    // Legacy URLs: schedules page → availability tab; registrations → bookings
    if (location.pathname.includes("available-schedules")) {
      return "availability";
    }
    return "bookings";
  }, [searchParams, location.pathname]);

  const setTab = (value: string) => {
    const next = value === "availability" ? "availability" : "bookings";
    navigate(`/dashboard/appointments?tab=${next}`, { replace: true });
  };

  const heroStats = [
    { label: "Pending", value: stats.pending, icon: Hourglass, accent: "text-amber-200" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, accent: "text-emerald-200" },
    { label: "Requests", value: stats.total, icon: Users, accent: "text-sky-200" },
    { label: "Open slots", value: stats.openSlots, icon: CalendarDays, accent: "text-indigo-200" },
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-900/20 bg-[linear-gradient(135deg,#101a3f_0%,#1e3a8a_48%,#172554_100%)] p-6 sm:p-8 text-white shadow-[0_20px_50px_rgba(30,58,138,0.28)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-64 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <CalendarClock className="h-3.5 w-3.5" />
              Scheduling hub
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Appointments</h1>
            <p className="text-sm leading-relaxed text-white/85 sm:text-base">
              Review booking requests to approve or reschedule, and keep your open availability slots up to date.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/70`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.accent}`} />
                  {stat.label}
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {stats.loaded ? stat.value : "–"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto w-full max-w-lg gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <TabsTrigger
            value="bookings"
            className="flex-1 gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition-all data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <ClipboardList className="h-4 w-4" />
            <span>Booking requests</span>
            {stats.loaded && stats.pending > 0 ? (
              <span className="ml-0.5 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold leading-none text-amber-950">
                {stats.pending}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="availability"
            className="group flex-1 gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition-all data-[state=active]:bg-[#1e3a8a] data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            <CalendarClock className="h-4 w-4" />
            <span>Availability</span>
            {stats.loaded && stats.openSlots > 0 ? (
              <span className="ml-0.5 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold leading-none text-slate-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                {stats.openSlots}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 focus-visible:outline-none">
          <MeetingRegistrations embedded />
        </TabsContent>

        <TabsContent value="availability" className="mt-4 focus-visible:outline-none">
          <AvailableSchedules embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Appointments;
