import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { getAdminAnalytics, type AdminAnalytics } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

const CHART_COLORS = ["#0A0A0A", "#FCC400", "#0058A8", "#0070D0", "#D9893A", "#64748b"];

const AdminAnalyticsPage = () => {
  const { data, loading, refreshing, reload } = useDashboardQuery<AdminAnalytics>(
    "admin-analytics",
    getAdminAnalytics
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reports & Analytics"
        description="Platform metrics � enrollments, revenue, instructor performance, and student demographics."
      >
        <Button
          onClick={() => void reload()}
          disabled={refreshing}
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Students" value={summary?.totalStudents ?? 0} />
        <AdminStatCard label="Courses" value={summary?.totalCourses ?? 0} />
        <AdminStatCard label="Instructors" value={summary?.totalInstructors ?? 0} />
        <AdminStatCard label="Revenue" value={`$${(summary?.totalRevenue ?? 0).toFixed(0)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by month</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.enrollmentsByMonth ?? []}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0A0A0A" fill="#0A0A0A" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by month</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueByMonth ?? []}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stripe" fill="#0A0A0A" name="Stripe" />
                <Bar dataKey="manual" fill="#FCC400" name="Manual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Students by country</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.studentsByCountry ?? []}
                  dataKey="count"
                  nameKey="country"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {(data?.studentsByCountry ?? []).map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top courses by enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(data?.coursePerformance ?? []).slice(0, 8).map((course) => (
                <div key={course.id} className="flex justify-between text-sm border-b pb-2">
                  <span className="font-medium truncate pr-4">{course.title}</span>
                  <span className="text-muted-foreground">{course.total_enrollments} enrolled</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
