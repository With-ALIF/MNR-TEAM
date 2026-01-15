import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, DollarSign, TrendingUp, Clock, CheckCircle, Download, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalPayable: 0,
    totalPaid: 0,
    totalDue: 0,
    pendingCount: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      // Fetch payments with tasks
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          *,
          tasks(title, status)
        `)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get instructor profiles separately
      const instructorIds = [...new Set(paymentsData?.map(p => p.instructor_id) || [])];
      
      let profilesMap: Record<string, any> = {};
      if (instructorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", instructorIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      // Combine data
      const enrichedPayments = paymentsData?.map(p => ({
        ...p,
        profiles: profilesMap[p.instructor_id] || null
      })) || [];
      
      setPayments(enrichedPayments);

      // Calculate stats
      const totalPayable = enrichedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPaid = enrichedPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDue = totalPayable - totalPaid;
      const pendingCount = enrichedPayments.filter((p) => p.status === "unpaid").length;

      setStats({ totalPayable, totalPaid, totalDue, pendingCount });
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const selectAllUnpaid = () => {
    const unpaidIds = payments
      .filter((p) => p.status === "unpaid")
      .map((p) => p.id);
    setSelectedPayments(unpaidIds);
  };

  const clearSelection = () => {
    setSelectedPayments([]);
  };

  const markAsPaid = async () => {
    if (selectedPayments.length === 0) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          notes: paymentNote || null,
        })
        .in("id", selectedPayments);

      if (error) throw error;

      toast({
        title: "Payments Updated",
        description: `${selectedPayments.length} payment(s) marked as paid.`,
      });

      setSelectedPayments([]);
      setPaymentNote("");
      setIsPayDialogOpen(false);
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markSingleAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Payment Updated",
        description: "Payment marked as paid.",
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Instructor", "Email", "Task", "Amount", "Status", "Paid At"];
    const rows = filteredPayments.map((p) => [
      p.profiles?.full_name || "",
      p.profiles?.email || "",
      p.tasks?.title || "",
      p.amount,
      p.status,
      p.paid_at ? format(new Date(p.paid_at), "yyyy-MM-dd") : "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Payments exported to CSV file.",
    });
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.tasks?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedTotal = payments
    .filter((p) => selectedPayments.includes(p.id))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Manage instructor payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            {selectedPayments.length > 0 && (
              <Button className="gradient-primary border-0" onClick={() => setIsPayDialogOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Mark {selectedPayments.length} as Paid
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Payable"
            value={`৳${stats.totalPayable.toLocaleString()}`}
            icon={TrendingUp}
            description="All time"
          />
          <StatCard
            title="Total Paid"
            value={`৳${stats.totalPaid.toLocaleString()}`}
            icon={CheckCircle}
            description="Completed payments"
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
            title="Pending Count"
            value={stats.pendingCount.toString()}
            icon={DollarSign}
            description="Unpaid entries"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by task or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={selectAllUnpaid}>
            Select All Unpaid
          </Button>
          {selectedPayments.length > 0 && (
            <Button variant="ghost" onClick={clearSelection}>
              Clear Selection
            </Button>
          )}
        </div>

        {/* Selection Info */}
        {selectedPayments.length > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {selectedPayments.length} payment(s) selected - Total: ৳{selectedTotal.toLocaleString()}
            </span>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Payments Found</h3>
                <p className="text-muted-foreground">
                  Payments will appear when tasks are assigned with amounts
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedPayments.length > 0 &&
                          selectedPayments.length ===
                            payments.filter((p) => p.status === "unpaid").length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) selectAllUnpaid();
                          else clearSelection();
                        }}
                      />
                    </TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid At</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className={selectedPayments.includes(payment.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayments.includes(payment.id)}
                          onCheckedChange={() => togglePaymentSelection(payment.id)}
                          disabled={payment.status === "paid"}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={payment.profiles?.avatar_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(payment.profiles?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{payment.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{payment.tasks?.title}</TableCell>
                      <TableCell className="font-semibold">৳{payment.amount}</TableCell>
                      <TableCell>
                        <StatusBadge variant={payment.status === "paid" ? "approved" : "pending"} />
                      </TableCell>
                      <TableCell>
                        {payment.paid_at
                          ? format(new Date(payment.paid_at), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {payment.status === "unpaid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markSingleAsPaid(payment.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Bulk Pay Dialog */}
        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Payments as Paid</DialogTitle>
              <DialogDescription>
                You are about to mark {selectedPayments.length} payment(s) as paid.
                Total amount: ৳{selectedTotal.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Add a payment note..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={markAsPaid} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
