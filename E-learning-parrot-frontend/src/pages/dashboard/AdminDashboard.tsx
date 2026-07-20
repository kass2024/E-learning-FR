import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  CreditCard,
  Megaphone,
  BarChart3,
  UserCheck,
  ShieldCheck,
  Loader2,
  RefreshCw,
  ArrowRight,
  Wallet,
  Clock,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { getAdminAnalytics, type AdminAnalytics } from "@/api/axios";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { institutionBrandingName, isPartnerInstitutionUser } from "@/lib/institutionContext";

const QUICK_LINKS = [
  { to: "/dashboard/users", label: "User Management", icon: Users, desc: "Admin, staff & roles" },
  { to: "/dashboard/instructor-approval", label: "Instructor Approval", icon: UserCheck, desc: "Approve new instructors" },
  { to: "/dashboard/course-approval", label: "Course Approval", icon: ShieldCheck, desc: "Publish pending courses" },
  { to: "/dashboard/revenue", label: "Revenue Management", icon: DollarSign, desc: "Platform income" },
  { to: "/dashboard/instructor-payouts", label: "Instructor Payouts", icon: Wallet, desc: "Approve withdrawals" },
  { to: "/dashboard/students", label: "Student Management", icon: GraduationCap, desc: "Learners & enrollments" },
  { to: "/dashboard/study-shifts", label: "Study Shifts", icon: Clock, desc: "Learner weekly class times" },
  { to: "/dashboard/payments", label: "Payment Management", icon: CreditCard, desc: "Stripe transactions" },
  { to: "/dashboard/marketing", label: "Marketing Management", icon: Megaphone, desc: "Webinars & campaigns" },
  { to: "/dashboard/analytics", label: "Reports & Analytics", icon: BarChart3, desc: "Full analytics dashboard" },
];

const AdminDashboard = () => {
  const {
    data,
    loading,
    refreshing,
    reload: fetchDashboardData,
  } = useDashboardQuery<AdminAnalytics>("admin-analytics", getAdminAnalytics);
  const navigate = useNavigate();
  const partnerView = isPartnerInstitutionUser();
  const institutionName = institutionBrandingName();

  const summary = data?.summary;
  const statsLoading = loading && !data;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={partnerView && institutionName ? `${institutionName} Dashboard` : "Admin Dashboard"}
        description={
          partnerView
            ? "Institution administration — manage learners, courses, revenue, and operations for your organization."
            : "Administration panel — users, courses, revenue, payments, marketing, and analytics."
        }
      >
        <Button
          onClick={() => void fetchDashboardData()}
          disabled={refreshing}
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900 font-semibold"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 ${statsLoading ? "opacity-70" : ""}`}>
        <AdminStatCard label="Students" value={summary?.totalStudents ?? 0} />
        <AdminStatCard label="Courses" value={summary?.totalCourses ?? 0} />
        <AdminStatCard label="Instructors" value={summary?.totalInstructors ?? 0} />
        <AdminStatCard label="Enrollments" value={summary?.totalEnrollments ?? 0} />
        <AdminStatCard label="Revenue" value={`$${(summary?.totalRevenue ?? 0).toFixed(0)}`} />
        <AdminStatCard label="Pending approvals" value={(summary?.pendingInstructors ?? 0) + (summary?.pendingCourses ?? 0)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Student enrollments (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.enrollmentsByMonth ?? []}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0A0A0A" fill="#0A0A0A" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total revenue</p>
              <p className="text-3xl font-bold text-[#0A0A0A]">${(summary?.totalRevenue ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending payments</p>
              <p className="text-xl font-semibold">{summary?.pendingPayments ?? 0}</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/dashboard/payments")}>
              Manage payments
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Administration panel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map((link) => (
            <Card
              key={link.to}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all h-full"
              onClick={() => navigate(link.to)}
            >
              <CardContent className="p-5">
                <link.icon className="h-6 w-6 text-[#0A0A0A] mb-3" />
                <p className="font-semibold">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Operations shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            ["/dashboard/courses", "Courses"],
            ["/dashboard/instructors", "Instructors"],
            ["/dashboard/classes", "Live Classes"],
            ["/dashboard/zoom-meetings", "Meeting"],
            ["/dashboard/zoom-webinars", "Webinars"],
            ["/dashboard/appointments", "Appointments"],
            ["/dashboard/materials", "Materials"],
            ["/dashboard/instructor/quizzes", "Assessment"],
          ].map(([path, label]) => (
            <Button key={path} variant="outline" size="sm" onClick={() => navigate(path)}>
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
