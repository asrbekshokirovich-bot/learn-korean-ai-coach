import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import Courses from "./pages/Courses";
import DemoTeacherDashboard from "./pages/DemoTeacherDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardRoute from "./components/DashboardRoute";
import NotFound from "./pages/NotFound";
import StudentLayout from "./layouts/StudentLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import { LanguageProvider } from "./contexts/LanguageContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses" element={<Courses />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/*" 
              element={
                <DashboardRoute>
                  <StudentLayout />
                </DashboardRoute>
              } 
            />
            <Route 
              path="/teacher/*" 
              element={
                <DashboardRoute>
                  <TeacherLayout />
                </DashboardRoute>
              } 
            />
            <Route 
              path="/demo-teacher" 
              element={
                <ProtectedRoute>
                  <DemoTeacherDashboard />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
