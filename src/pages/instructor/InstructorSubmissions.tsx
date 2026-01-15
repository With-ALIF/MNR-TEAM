import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Search, FileText, Plus, ExternalLink, Upload, File, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { FilePreview } from "@/components/FilePreview";
import { useSearchParams } from "react-router-dom";

export default function InstructorSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    taskId: "",
    submissionUrl: "",
    linkType: "google_drive",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionType, setSubmissionType] = useState<"link" | "file">("link");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      fetchSubmissions();
      fetchTasks();
    }
  }, [user]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId) {
      setFormData((prev) => ({ ...prev, taskId }));
      setIsSubmitDialogOpen(true);
    }
  }, [searchParams]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          tasks(title)
        `)
        .eq("instructor_id", user?.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user?.id)
        .in("status", ["pending", "in_progress", "revision_required"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Max 50MB
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    const fileExt = selectedFile.name.split(".").pop();
    const fileName = `${user.id}/${formData.taskId}/${Date.now()}.${fileExt}`;

    setUploadProgress(10);

    const { data, error } = await supabase.storage
      .from("submissions")
      .upload(fileName, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    setUploadProgress(80);

    const { data: urlData } = supabase.storage
      .from("submissions")
      .getPublicUrl(fileName);

    setUploadProgress(100);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let submissionUrl = formData.submissionUrl;
      let fileUrl: string | null = null;

      // Upload file if file submission type
      if (submissionType === "file" && selectedFile) {
        fileUrl = await uploadFile();
        submissionUrl = fileUrl || "";
      }

      // Check if there's an existing submission for revision
      const { data: existingSubmissions } = await supabase
        .from("submissions")
        .select("revision_number")
        .eq("task_id", formData.taskId)
        .eq("instructor_id", user.id)
        .order("revision_number", { ascending: false })
        .limit(1);

      const revisionNumber = existingSubmissions && existingSubmissions.length > 0
        ? (existingSubmissions[0].revision_number || 0) + 1
        : 1;

      const { error } = await supabase.from("submissions").insert({
        task_id: formData.taskId,
        instructor_id: user.id,
        submission_url: submissionUrl,
        link_type: submissionType === "file" ? "file_upload" : formData.linkType,
        revision_number: revisionNumber,
        status: "pending",
        file_url: fileUrl,
      });

      if (error) throw error;

      // Update task status to submitted
      await supabase
        .from("tasks")
        .update({ status: "submitted" })
        .eq("id", formData.taskId);

      toast({
        title: "Submission Successful",
        description: "Your work has been submitted for review.",
      });

      setFormData({ taskId: "", submissionUrl: "", linkType: "google_drive" });
      setSelectedFile(null);
      setUploadProgress(0);
      setSubmissionType("link");
      setIsSubmitDialogOpen(false);
      fetchSubmissions();
      fetchTasks();
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

  const filteredSubmissions = submissions.filter((s) =>
    s.tasks?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">My Submissions</h1>
            <p className="text-muted-foreground">View and submit your work</p>
          </div>
          <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary border-0 shadow-glow">
                <Plus className="mr-2 h-4 w-4" />
                New Submission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Work</DialogTitle>
                <DialogDescription>
                  Submit a link to your completed work for review.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskId">Select Task</Label>
                    <Select
                      value={formData.taskId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, taskId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submission Type Toggle */}
                  <div className="space-y-2">
                    <Label>Submission Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={submissionType === "link" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSubmissionType("link")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Link
                      </Button>
                      <Button
                        type="button"
                        variant={submissionType === "file" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSubmissionType("file")}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        File Upload
                      </Button>
                    </div>
                  </div>

                  {submissionType === "link" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="linkType">Link Type</Label>
                        <Select
                          value={formData.linkType}
                          onValueChange={(value) =>
                            setFormData({ ...formData, linkType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google_drive">Google Drive</SelectItem>
                            <SelectItem value="github">GitHub</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="docs">Google Docs</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="submissionUrl">Submission URL</Label>
                        <Input
                          id="submissionUrl"
                          type="url"
                          value={formData.submissionUrl}
                          onChange={(e) =>
                            setFormData({ ...formData, submissionUrl: e.target.value })
                          }
                          placeholder="https://..."
                          required={submissionType === "link"}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Upload File</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.zip,.rar,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.avi,.jpg,.jpeg,.png,.gif"
                      />
                      {selectedFile ? (
                        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                          <File className="h-8 w-8 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                        >
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, DOC, ZIP, PPT, XLS, Video, Images (Max 50MB)
                          </p>
                        </div>
                      )}
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSubmitDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !formData.taskId || (submissionType === "link" && !formData.submissionUrl) || (submissionType === "file" && !selectedFile)}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
                <h3 className="font-semibold text-lg">No Submissions Yet</h3>
                <p className="text-muted-foreground">
                  Submit your work when you complete a task
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Link Type</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="w-[100px]">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.tasks?.title}
                      </TableCell>
                      <TableCell className="capitalize">
                        {submission.link_type?.replace("_", " ")}
                      </TableCell>
                      <TableCell>#{submission.revision_number}</TableCell>
                      <TableCell>
                        <StatusBadge variant={submission.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {submission.link_type === "file_upload" && submission.file_url ? (
                          <FilePreview 
                            url={submission.file_url} 
                            fileName={submission.tasks?.title}
                            linkType={submission.link_type}
                          />
                        ) : (
                          <a
                            href={submission.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
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
