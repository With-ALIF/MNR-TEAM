import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        pending: "bg-warning/10 text-warning border border-warning/20",
        approved: "bg-success/10 text-success border border-success/20",
        rejected: "bg-destructive/10 text-destructive border border-destructive/20",
        revision_required: "bg-info/10 text-info border border-info/20",
        in_progress: "bg-primary/10 text-primary border border-primary/20",
        submitted: "bg-info/10 text-info border border-info/20",
        completed: "bg-success/10 text-success border border-success/20",
        paid: "bg-success/10 text-success border border-success/20",
        unpaid: "bg-destructive/10 text-destructive border border-destructive/20",
        low: "bg-success/10 text-success border border-success/20",
        medium: "bg-warning/10 text-warning border border-warning/20",
        high: "bg-destructive/10 text-destructive border border-destructive/20",
        active: "bg-success/10 text-success border border-success/20",
        inactive: "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: {
      variant: "pending",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  revision_required: "Revision Required",
  in_progress: "In Progress",
  submitted: "Submitted",
  completed: "Completed",
  paid: "Paid",
  unpaid: "Unpaid",
  low: "Low",
  medium: "Medium",
  high: "High",
  active: "Active",
  inactive: "Inactive",
};

export function StatusBadge({ className, variant, label, ...props }: StatusBadgeProps) {
  const displayLabel = label || (variant ? statusLabels[variant] : "");
  
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {displayLabel}
    </span>
  );
}
