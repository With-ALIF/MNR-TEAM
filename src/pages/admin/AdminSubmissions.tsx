import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Search, FileText, MoreHorizontal, CheckCircle, XCircle, RotateCcw, ExternalLink, Eye, File } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FilePreview } from "@/components/FilePreview";

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected" | "revision_required">("approved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Get submissions with tasks
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select(`
          *,
          tasks(title, amount)
        `)
        .order("submitted_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get instructor profiles separately
      const instructorIds = [...new Set(submissionsData?.map(s => s.instructor_id) || [])];
      
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
      const enrichedSubmissions = submissionsData?.map(s => ({
        ...s,
        profiles: profilesMap[s.instructor_id] || null
      })) || [];

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (submission: any) => {
    setSelectedSubmission(submission);
    setReviewComment("");
    setReviewStatus("approved");
    setIsReviewDialogOpen(true);
  };

  const handleReview = async () => {
    if (!selectedSubmission || !user) return;
    setIsSubmitting(true);

    try {
      // Create review record
      const { error: reviewError } = await supabase.from("reviews").insert({
        submission_id: selectedSubmission.id,
        reviewer_id: user.id,
        status: reviewStatus,
        comment: reviewComment,
      });

      if (reviewError) throw reviewError;

      // Update submission status
      const { error: submissionError } = await supabase
        .from("submissions")
        .update({ status: reviewStatus })
        .eq("id", selectedSubmission.id);

      if (submissionError) throw submissionError;

      // Update task status based on review
      type TaskStatus = "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "revision_required" | "completed";
      let taskStatus: TaskStatus = "submitted";
      if (reviewStatus === "approved") {
        taskStatus = "completed";
      } else if (reviewStatus === "rejected") {
        taskStatus = "rejected";
      } else if (reviewStatus === "revision_required") {
        taskStatus = "revision_required";
      }

      await supabase
        .from("tasks")
        .update({ 
          status: taskStatus,
          is_locked: reviewStatus === "approved"
        })
        .eq("id", selectedSubmission.task_id);

      toast({
        title: "Review Submitted",
        description: `Submission has been ${reviewStatus.replace("_", " ")}.`,
      });

      setIsReviewDialogOpen(false);
      fetchSubmissions();
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

  const quickAction = async (submission: any, status: "approved" | "rejected" | "revision_required") => {
    if (!user) return;

    try {
      await supabase.from("reviews").insert({
        submission_id: submission.id,
        reviewer_id: user.id,
        status: status,
        comment: null,
      });

      await supabase
        .from("submissions")
        .update({ status })
        .eq("id", submission.id);

      type TaskStatus = "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "revision_required" | "completed";
      const taskStatus: TaskStatus = status === "approved" ? "completed" : status as TaskStatus;
      await supabase
        .from("tasks")
        .update({ 
          status: taskStatus,
          is_locked: status === "approved"
        })
        .eq("id", submission.task_id);

      toast({
        title: "Status Updated",
        description: `Submission ${status.replace("_", " ")}.`,
      });

      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.tasks?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">Submissions</h1>
          <p className="text-muted-foreground">Review and manage instructor submissions</p>
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="revision_required">Revision Required</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Submissions Found</h3>
                <p className="text-muted-foreground">
                  Submissions will appear here when instructors submit their work
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Link Type</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={submission.profiles?.avatar_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(submission.profiles?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{submission.profiles?.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{submission.tasks?.title}</p>
                          {submission.tasks?.amount > 0 && (
                            <p className="text-sm text-muted-foreground">৳{submission.tasks.amount}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {submission.link_type?.replace("_", " ") || "-"}
                      </TableCell>
                      <TableCell>#{submission.revision_number}</TableCell>
                      <TableCell>
                        <StatusBadge variant={submission.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {submission.file_url ? (
                            <FilePreview url={submission.file_url} linkType="file_upload" />
                          ) : (
                            <a
                              href={submission.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="icon" title="View submission">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {submission.status === "pending" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openReviewDialog(submission)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Review with Comment
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => quickAction(submission, "approved")}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Quick Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => quickAction(submission, "revision_required")}>
                                  <RotateCcw className="mr-2 h-4 w-4 text-orange-600" />
                                  Request Revision
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => quickAction(submission, "rejected")}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                  Reject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Submission</DialogTitle>
              <DialogDescription>
                Review the submission for "{selectedSubmission?.tasks?.title}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-2">Submission:</p>
                {selectedSubmission?.file_url ? (
                  <div className="space-y-2">
                    <FilePreview url={selectedSubmission.file_url} linkType="file_upload" />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <File className="h-3 w-3" />
                      File Upload
                    </p>
                  </div>
                ) : (
                  <a
                    href={selectedSubmission?.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {selectedSubmission?.submission_url}
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <Label>Review Decision</Label>
                <Select
                  value={reviewStatus}
                  onValueChange={(value: "approved" | "rejected" | "revision_required") =>
                    setReviewStatus(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="revision_required">Request Revision</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Comment (Optional)</Label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Add feedback or instructions..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReview} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
