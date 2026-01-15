import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ClipboardList, DollarSign, CheckCircle, Clock, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function InstructorDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    totalEarned: 0,
    totalDue: 0,
    approvalRate: 0,
    onTimeRate: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user?.id)
        .order("created_at", { ascending: false });

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("instructor_id", user?.id);

      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select(`*, tasks(title)`)
        .eq("instructor_id", user?.id)
        .order("submitted_at", { ascending: false })
        .limit(5);

      const tasks = tasksData || [];
      const payments = paymentsData || [];
      const submissions = submissionsData || [];

      const totalEarned = payments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const totalDue = payments
        .filter((p) => p.status === "unpaid")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const completed = tasks.filter((t) => t.status === "completed").length;
      const approved = submissions.filter((s) => s.status === "approved").length;
      const totalSubmissions = submissions.length;
      const approvalRate = totalSubmissions > 0 ? Math.round((approved / totalSubmissions) * 100) : 0;

      setStats({
        totalTasks: tasks.length,
        completed,
        pending: tasks.filter((t) => t.status === "pending").length,
        inProgress: tasks.filter((t) => ["in_progress", "submitted"].includes(t.status)).length,
        totalEarned,
        totalDue,
        approvalRate,
        onTimeRate: 85, // Placeholder - would need deadline tracking
      });

      setRecentTasks(tasks.slice(0, 5));
      setRecentSubmissions(submissions);
    } catch (error) {
      console.error(error);
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
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome back, {profile?.full_name?.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground">Here's your work overview for today.</p>
          </div>
          <Link to="/instructor/tasks">
            <Button className="gradient-primary border-0 shadow-glow">
              <ClipboardList className="mr-2 h-4 w-4" />
              View All Tasks
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tasks"
            value={stats.totalTasks}
            icon={ClipboardList}
            variant="primary"
            description="Assigned to you"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle}
            variant="success"
            description="Approved tasks"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={Clock}
            variant="warning"
            description="Pending review"
          />
          <StatCard
            title="Total Earned"
            value={`৳${stats.totalEarned.toLocaleString()}`}
            icon={DollarSign}
            variant="success"
            description="Paid amount"
          />
        </div>

        {/* Earnings Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Earnings Summary</span>
              <Link to="/instructor/earnings">
                <Button variant="ghost" size="sm">
                  View Details <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">৳{stats.totalEarned.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <p className="text-sm text-muted-foreground mb-1">Pending Payment</p>
                <p className="text-2xl font-bold text-orange-600">৳{stats.totalDue.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm text-muted-foreground mb-1">Total Expected</p>
                <p className="text-2xl font-bold text-blue-600">
                  ৳{(stats.totalEarned + stats.totalDue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Recent Tasks</span>
                <Link to="/instructor/tasks">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No tasks assigned yet</p>
                  </div>
                ) : (
                  recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.deadline
                            ? `Due: ${format(new Date(task.deadline), "MMM d, yyyy")}`
                            : "No deadline"}
                        </p>
                      </div>
                      <StatusBadge variant={task.status} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>Recent Submissions</span>
                <Link to="/instructor/submissions">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No submissions yet</p>
                  </div>
                ) : (
                  recentSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{submission.tasks?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <StatusBadge variant={submission.status} />
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
