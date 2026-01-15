import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/auth/AdminLogin";
import AdminSignup from "./pages/auth/AdminSignup";
import InstructorLogin from "./pages/auth/InstructorLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import InstructorTasks from "./pages/instructor/InstructorTasks";
import InstructorSubmissions from "./pages/instructor/InstructorSubmissions";
import InstructorEarnings from "./pages/instructor/InstructorEarnings";
import InstructorSettings from "./pages/instructor/InstructorSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/instructor/login" element={<InstructorLogin />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/instructors" element={<ProtectedRoute requiredRole="admin"><AdminInstructors /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute requiredRole="admin"><AdminTasks /></ProtectedRoute>} />
            <Route path="/admin/submissions" element={<ProtectedRoute requiredRole="admin"><AdminSubmissions /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute requiredRole="admin"><AdminPayments /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
            
            {/* Protected Instructor Routes */}
            <Route path="/instructor" element={<ProtectedRoute requiredRole="instructor"><InstructorDashboard /></ProtectedRoute>} />
            <Route path="/instructor/tasks" element={<ProtectedRoute requiredRole="instructor"><InstructorTasks /></ProtectedRoute>} />
            <Route path="/instructor/submissions" element={<ProtectedRoute requiredRole="instructor"><InstructorSubmissions /></ProtectedRoute>} />
            <Route path="/instructor/earnings" element={<ProtectedRoute requiredRole="instructor"><InstructorEarnings /></ProtectedRoute>} />
            <Route path="/instructor/settings" element={<ProtectedRoute requiredRole="instructor"><InstructorSettings /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
