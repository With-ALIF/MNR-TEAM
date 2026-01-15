import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingReviews: 0,
    overdueTasks: 0,
    totalPayable: 0,
    totalInstructors: 0,
    completedTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [tasksRes, submissionsRes, paymentsRes, rolesRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("submissions").select("*").eq("status", "pending"),
        supabase.from("payments").select("amount").eq("status", "unpaid"),
        supabase.from("user_roles").select("user_id").eq("role", "instructor"),
      ]);

      const tasks = tasksRes.data || [];
      const pendingSubmissions = submissionsRes.data || [];
      const unpaidPayments = paymentsRes.data || [];
      const instructorCount = rolesRes.data?.length || 0;

      const now = new Date();
      const overdueTasks = tasks.filter(
        (t) => t.deadline && new Date(t.deadline) < now && t.status !== "completed"
      );
      const completedTasks = tasks.filter((t) => t.status === "completed");
      const totalPayable = unpaidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        totalTasks: tasks.length,
        pendingReviews: pendingSubmissions.length,
        overdueTasks: overdueTasks.length,
        totalPayable,
        totalInstructors: instructorCount,
        completedTasks: completedTasks.length,
      });

      // Fetch recent tasks
      const { data: recentTasksData } = await supabase
        .from("tasks")
        .select("*, profiles!tasks_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentTasks(recentTasksData || []);

      // Fetch recent submissions with separate profile lookup
      const { data: recentSubmissionsData } = await supabase
        .from("submissions")
        .select("*, tasks(title)")
        .order("submitted_at", { ascending: false })
        .limit(5);

      // Get instructor profiles separately
      if (recentSubmissionsData && recentSubmissionsData.length > 0) {
        const instructorIds = [...new Set(recentSubmissionsData.map(s => s.instructor_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", instructorIds);
        
        const profilesMap: Record<string, any> = {};
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = p;
        });

        const enrichedSubmissions = recentSubmissionsData.map(s => ({
          ...s,
          profiles: profilesMap[s.instructor_id] || null
        }));
        setRecentSubmissions(enrichedSubmissions);
      } else {
        setRecentSubmissions([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your overview.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/instructors">
                <Users className="mr-2 h-4 w-4" />
                Add Instructor
              </Link>
            </Button>
            <Button asChild className="gradient-primary border-0 shadow-glow">
              <Link to="/admin/tasks">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Total Tasks"
            value={stats.totalTasks}
            icon={ClipboardList}
            variant="primary"
          />
          <StatCard
            title="Pending Reviews"
            value={stats.pendingReviews}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Overdue Tasks"
            value={stats.overdueTasks}
            icon={AlertCircle}
            variant="destructive"
          />
          <StatCard
            title="Completed"
            value={stats.completedTasks}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Instructors"
            value={stats.totalInstructors}
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Total Payable"
            value={`৳${stats.totalPayable.toLocaleString()}`}
            icon={DollarSign}
            variant="success"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Recent Tasks</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/tasks">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks yet
                  </p>
                ) : (
                  recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.profiles?.full_name || "Unassigned"}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <StatusBadge variant={task.status} />
                        {task.deadline && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.deadline), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Recent Submissions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/submissions">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSubmissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No submissions yet
                  </p>
                ) : (
                  recentSubmissions.map((submission: any) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{submission.tasks?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          by {submission.profiles?.full_name || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <StatusBadge variant={submission.status} />
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
