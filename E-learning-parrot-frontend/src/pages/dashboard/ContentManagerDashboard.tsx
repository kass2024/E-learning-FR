import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BookOpen,
  FolderOpen,
  BarChart3,
  Eye,
} from "lucide-react";

const ContentManagerDashboard = () => {
  const stats = [
    { label: "Pending Review", value: "23", icon: Clock, color: "text-accent" },
    { label: "Approved Today", value: "15", icon: CheckCircle, color: "text-green-500" },
    { label: "Total Courses", value: "342", icon: BookOpen, color: "text-primary" },
    { label: "Flagged Content", value: "7", icon: AlertTriangle, color: "text-destructive" },
  ];

  const pendingContent = [
    {
      title: "Introduction to Blockchain Technology",
      instructor: "Dr. Robert Smith",
      type: "New Course",
      submitted: "2 hours ago",
      priority: "high",
      category: "Technology",
    },
    {
      title: "Updated Module: React Hooks",
      instructor: "Sarah Johnson",
      type: "Content Update",
      submitted: "5 hours ago",
      priority: "medium",
      category: "Development",
    },
    {
      title: "Digital Marketing Strategy 2024",
      instructor: "Emma Williams",
      type: "New Course",
      submitted: "1 day ago",
      priority: "medium",
      category: "Marketing",
    },
  ];

  const categories = [
    { name: "Development", courses: 124, pending: 8 },
    { name: "Business", courses: 87, pending: 5 },
    { name: "Design", courses: 63, pending: 4 },
    { name: "Marketing", courses: 68, pending: 6 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Content Manager Dashboard</h1>
        <p className="text-muted-foreground">Review and manage platform content</p>
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

      {/* Pending Content Review */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Pending Review</CardTitle>
              <CardDescription>Content awaiting your approval</CardDescription>
            </div>
            <Badge variant="destructive">{pendingContent.length} items</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingContent.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{item.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{item.instructor}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <span>•</span>
                      <span>{item.submitted}</span>
                    </div>
                  </div>
                  <Badge
                    variant={item.priority === "high" ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {item.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                  <Button variant="default" size="sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button variant="destructive" size="sm">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Overview</CardTitle>
              <CardDescription>Content distribution by category</CardDescription>
            </div>
            <Button variant="outline">
              <FolderOpen className="w-4 h-4 mr-2" />
              Manage Categories
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Card key={category.name} className="hover:shadow-medium transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <FolderOpen className="w-6 h-6 text-primary" />
                    {category.pending > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {category.pending} pending
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.courses} courses</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button variant="outline" size="lg" className="h-24 flex-col gap-2">
          <BarChart3 className="w-6 h-6" />
          <span>View Analytics</span>
        </Button>
        <Button variant="outline" size="lg" className="h-24 flex-col gap-2">
          <AlertTriangle className="w-6 h-6" />
          <span>Flagged Content</span>
        </Button>
        <Button variant="outline" size="lg" className="h-24 flex-col gap-2">
          <FileText className="w-6 h-6" />
          <span>Generate Report</span>
        </Button>
      </div>
    </div>
  );
};

export default ContentManagerDashboard;
