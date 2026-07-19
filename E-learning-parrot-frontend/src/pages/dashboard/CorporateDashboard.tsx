import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  BookOpen,
  BarChart3,
  TrendingUp,
  Award,
  Building2,
  UserPlus,
  Download,
  Target,
} from "lucide-react";

const CorporateDashboard = () => {
  const stats = [
    { label: "Team Members", value: "156", icon: Users, color: "text-primary" },
    { label: "Active Licenses", value: "200", icon: Building2, color: "text-secondary" },
    { label: "Courses Assigned", value: "24", icon: BookOpen, color: "text-accent" },
    { label: "Completion Rate", value: "78%", icon: TrendingUp, color: "text-green-500" },
  ];

  const teamProgress = [
    {
      department: "Engineering",
      members: 45,
      coursesCompleted: 120,
      avgProgress: 82,
      certificates: 38,
    },
    {
      department: "Marketing",
      members: 28,
      coursesCompleted: 85,
      avgProgress: 75,
      certificates: 22,
    },
    {
      department: "Sales",
      members: 35,
      coursesCompleted: 102,
      avgProgress: 88,
      certificates: 31,
    },
    {
      department: "HR",
      members: 18,
      coursesCompleted: 64,
      avgProgress: 71,
      certificates: 15,
    },
  ];

  const assignedCourses = [
    {
      title: "Leadership & Management",
      enrolled: 89,
      completed: 67,
      deadline: "Mar 30, 2024",
      priority: "high",
    },
    {
      title: "Data Analytics Fundamentals",
      enrolled: 45,
      completed: 38,
      deadline: "Apr 15, 2024",
      priority: "medium",
    },
    {
      title: "Cybersecurity Essentials",
      enrolled: 156,
      completed: 98,
      deadline: "May 1, 2024",
      priority: "high",
    },
  ];

  const topPerformers = [
    { name: "Alice Johnson", department: "Engineering", completed: 12, score: 96 },
    { name: "Bob Smith", department: "Sales", completed: 10, score: 94 },
    { name: "Carol Williams", department: "Marketing", completed: 11, score: 93 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Corporate Dashboard</h1>
          <p className="text-muted-foreground">Acme Corp - Team Learning Analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Members
          </Button>
          <Button variant="hero">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-medium transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Progress by Department */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Department Progress</CardTitle>
              <CardDescription>Learning metrics by team</CardDescription>
            </div>
            <Button variant="outline">View Details</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamProgress.map((dept) => (
              <Card key={dept.department} className="hover:shadow-medium transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{dept.department}</h3>
                      <p className="text-sm text-muted-foreground">{dept.members} team members</p>
                    </div>
                    <Badge variant="secondary">{dept.avgProgress}%</Badge>
                  </div>
                  <Progress value={dept.avgProgress} className="mb-4" />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Courses Completed</p>
                      <p className="font-semibold text-lg">{dept.coursesCompleted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Certificates</p>
                      <p className="font-semibold text-lg">{dept.certificates}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Avg. Progress</p>
                      <p className="font-semibold text-lg">{dept.avgProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Courses</CardTitle>
            <CardDescription>Company-wide training programs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedCourses.map((course) => (
                <div key={course.title} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{course.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span>Due: {course.deadline}</span>
                      </div>
                    </div>
                    <Badge
                      variant={course.priority === "high" ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {course.priority}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {course.completed}/{course.enrolled} completed
                      </span>
                    </div>
                    <Progress value={(course.completed / course.enrolled) * 100} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>Leading learners this month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary text-primary-foreground font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{performer.name}</h4>
                    <p className="text-sm text-muted-foreground">{performer.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{performer.score}%</p>
                    <p className="text-xs text-muted-foreground">{performer.completed} courses</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                View Full Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            License Usage
          </CardTitle>
          <CardDescription>Track your license allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Licenses Used</span>
                <span className="font-bold">156 / 200</span>
              </div>
              <Progress value={78} />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">44</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">$9,800</p>
                <p className="text-xs text-muted-foreground">Monthly Cost</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorporateDashboard;
