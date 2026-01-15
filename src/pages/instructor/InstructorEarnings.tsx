import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function InstructorEarnings() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarned: 0,
    totalPaid: 0,
    totalDue: 0,
    completedTasks: 0,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          tasks(title, status)
        `)
        .eq("instructor_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const paymentData = data || [];
      setPayments(paymentData);

      // Calculate stats
      const totalEarned = paymentData.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPaid = paymentData
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDue = totalEarned - totalPaid;
      const completedTasks = paymentData.filter((p) => p.tasks?.status === "completed").length;

      setStats({ totalEarned, totalPaid, totalDue, completedTasks });
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">My Earnings</h1>
          <p className="text-muted-foreground">Track your earnings and payments</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Earned"
            value={`৳${stats.totalEarned.toLocaleString()}`}
            icon={TrendingUp}
            description="All time earnings"
          />
          <StatCard
            title="Total Paid"
            value={`৳${stats.totalPaid.toLocaleString()}`}
            icon={CheckCircle}
            description="Payments received"
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Total Due"
            value={`৳${stats.totalDue.toLocaleString()}`}
            icon={Clock}
            description="Pending payments"
            className="border-l-4 border-l-orange-500"
          />
          <StatCard
            title="Completed Tasks"
            value={stats.completedTasks.toString()}
            icon={DollarSign}
            description="Approved & paid"
          />
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Payments Yet</h3>
                <p className="text-muted-foreground">
                  Complete tasks to start earning
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid At</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.tasks?.title}
                      </TableCell>
                      <TableCell>৳{payment.amount}</TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={payment.status === "paid" ? "approved" : "pending"}
                        />
                      </TableCell>
                      <TableCell>
                        {payment.paid_at
                          ? format(new Date(payment.paid_at), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
