import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import {
  ClipboardList,
  Users,
  Shield,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Zap,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Task Management",
    description: "Create, assign, and track tasks with deadlines and priorities.",
  },
  {
    icon: Users,
    title: "Instructor Portal",
    description: "Dedicated dashboard for instructors to manage their work.",
  },
  {
    icon: DollarSign,
    title: "Payment Tracking",
    description: "Automatic earnings calculation and payment management.",
  },
  {
    icon: Shield,
    title: "Secure Access",
    description: "Role-based access control with complete data security.",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "instructor") {
        navigate("/instructor");
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow animate-float">
                <ClipboardList className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl">
              <span className="block">Instructor Task </span>
              <span className="block text-primary">Management Portal</span>
            </h1>
            

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="min-w-[200px] gradient-primary border-0 shadow-glow hover:opacity-90 transition-all duration-300"
                onClick={() => navigate("/admin/login")}
              >
                <Shield className="mr-2 h-5 w-5" />
                Admin Login
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] bg-card/10 border-primary-foreground/20 text-primary-foreground hover:bg-card/20"
                onClick={() => navigate("/instructor/login")}
              >
                <Users className="mr-2 h-5 w-5" />
                Instructor Login
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
