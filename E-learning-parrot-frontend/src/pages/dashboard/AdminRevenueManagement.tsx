import { useMemo, useState } from "react";
import {
  Building2,
  DollarSign,
  GraduationCap,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { getAdminAnalytics, type AdminAnalytics } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { filterBySmartSearch } from "@/lib/smartSearch";

const AdminRevenueManagement = () => {
  const navigate = useNavigate();
  const { data, loading, refreshing, reload } = useDashboardQuery<AdminAnalytics>(
    "admin-analytics",
    getAdminAnalytics
  );

  const [instructorSearch, setInstructorSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");

  const summary = data?.summary;
  const sharePercent = summary?.instructorSharePercent ?? 70;
  const platformPercent = summary?.platformSharePercent ?? 30;

  const chartData = data?.revenueByMonthSplit ?? data?.revenueByMonth ?? [];

  const instructors = data?.instructorPerformance ?? [];
  const courses = data?.coursePerformance ?? [];

  const filteredInstructors = useMemo(
    () =>
      filterBySmartSearch(instructors, instructorSearch, (row) => [
        row.name,
        row.email,
        row.status,
        row.courses_assigned,
        row.total_revenue,
        row.instructor_earnings,
        row.platform_earnings,
        row.paid_out,
        row.pending_payout,
        row.available_balance,
      ]),
    [instructors, instructorSearch]
  );

  const filteredCourses = useMemo(
    () =>
      filterBySmartSearch(courses, courseSearch, (row) => [
        row.title,
        row.status,
        row.instructor_label,
        ...(row.instructor_names ?? []),
        row.revenue,
        row.instructor_earnings,
        row.platform_earnings,
        row.paid_enrollments,
        row.price,
      ]),
    [courses, courseSearch]
  );

  const sortedInstructors = useMemo(
    () => [...filteredInstructors].sort((a, b) => (b.instructor_earnings ?? 0) - (a.instructor_earnings ?? 0)),
    [filteredInstructors]
  );

  const sortedCourses = useMemo(
    () => [...filteredCourses].sort((a, b) => b.revenue - a.revenue),
    [filteredCourses]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Revenue Management"
        description="Track gross income and how revenue is split between instructors and the platform."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate("/dashboard/payments")}>
            View payments
          </Button>
          <Button variant="secondary" onClick={() => navigate("/dashboard/instructor-payouts")}>
            Payout approvals
          </Button>
          <Button
            onClick={() => void reload()}
            disabled={refreshing}
            className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900"
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <AdminStatCard
          label="Gross revenue"
          value={`$${(summary?.totalRevenue ?? 0).toFixed(2)}`}
          hint="Paid Stripe checkout only"
        />
        <AdminStatCard
          label="Instructor earnings"
          value={`$${(summary?.instructorEarnings ?? 0).toFixed(2)}`}
          hint={`${sharePercent}% instructor share`}
        />
        <AdminStatCard
          label="Platform earnings"
          value={`$${(summary?.platformEarnings ?? 0).toFixed(2)}`}
          hint={`${platformPercent}% admin share`}
        />
        <AdminStatCard label="Paid enrollments" value={summary?.paidEnrollments ?? 0} />
        <AdminStatCard
          label="Pending payouts"
          value={summary?.pendingPayoutRequests ?? 0}
          hint={`$${(summary?.pendingPayoutAmount ?? 0).toFixed(2)} awaiting approval`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
              <GraduationCap className="h-5 w-5" />
              Instructor pool
            </CardTitle>
            <CardDescription>{sharePercent}% of gross revenue owed to instructors</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-800">${(summary?.instructorEarnings ?? 0).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Across {instructors.length} instructor{instructors.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#0A0A0A]/20 bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-[#0A0A0A]">
              <Building2 className="h-5 w-5" />
              Platform pool
            </CardTitle>
            <CardDescription>{platformPercent}% retained by the system admin</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#0A0A0A]">${(summary?.platformEarnings ?? 0).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">After instructor revenue share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payout queue
            </CardTitle>
            <CardDescription>Instructor withdrawal requests awaiting action</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${(summary?.pendingPayoutAmount ?? 0).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.pendingPayoutRequests ?? 0} open request
              {(summary?.pendingPayoutRequests ?? 0) === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly revenue split
          </CardTitle>
          <CardDescription>Instructor vs platform share over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {loading && !data ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`,
                    name === "instructor_earnings" ? "Instructor" : name === "platform_earnings" ? "Platform" : "Total",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "instructor_earnings" ? "Instructor earnings" : "Platform earnings"
                  }
                />
                <Bar dataKey="instructor_earnings" stackId="split" fill="#059669" radius={[0, 0, 0, 0]} />
                <Bar dataKey="platform_earnings" stackId="split" fill="#0A0A0A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="instructors" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="instructors" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Instructor earnings
          </TabsTrigger>
          <TabsTrigger value="platform" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Platform earnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructors">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Instructor earnings breakdown</CardTitle>
                <CardDescription>
                  Revenue, share, payouts, and available balance per instructor
                </CardDescription>
              </div>
              <SmartSearchInput
                id="instructor-earnings-search"
                value={instructorSearch}
                onChange={setInstructorSearch}
                placeholder="Search instructor, email, earnings, payout…"
                resultCount={sortedInstructors.length}
                totalCount={instructors.length}
                className="w-full sm:w-72"
              />
            </CardHeader>
            <CardContent>
              {sortedInstructors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {instructorSearch ? "No instructors match your search." : "No instructors yet."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Instructor</TableHead>
                        <TableHead>Courses</TableHead>
                        <TableHead>Gross revenue</TableHead>
                        <TableHead>Instructor share</TableHead>
                        <TableHead>Paid out</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedInstructors.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <p className="font-medium">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
                          </TableCell>
                          <TableCell>{row.courses_assigned}</TableCell>
                          <TableCell>${(row.total_revenue ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="font-semibold text-emerald-700">
                            ${(row.instructor_earnings ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell>${(row.paid_out ?? 0).toFixed(2)}</TableCell>
                          <TableCell>${(row.pending_payout ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">${(row.available_balance ?? 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Platform earnings by course</CardTitle>
                <CardDescription>
                  Admin share ({platformPercent}%) from each course after instructor split
                </CardDescription>
              </div>
              <SmartSearchInput
                id="platform-earnings-search"
                value={courseSearch}
                onChange={setCourseSearch}
                placeholder="Search course, instructor, revenue…"
                resultCount={sortedCourses.length}
                totalCount={courses.length}
                className="w-full sm:w-72"
              />
            </CardHeader>
            <CardContent>
              {sortedCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {courseSearch ? "No courses match your search." : "No course revenue yet."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Course</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Paid enrollments</TableHead>
                        <TableHead>Gross revenue</TableHead>
                        <TableHead>Instructor share</TableHead>
                        <TableHead>Platform share</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-xs text-muted-foreground">${course.price.toFixed(2)} list price</p>
                          </TableCell>
                          <TableCell className="text-sm">{course.instructor_label || "Unassigned"}</TableCell>
                          <TableCell>{course.paid_enrollments}</TableCell>
                          <TableCell>${course.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-emerald-700">
                            ${(course.instructor_earnings ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-semibold text-[#0A0A0A]">
                            ${(course.platform_earnings ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {course.status || "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRevenueManagement;
