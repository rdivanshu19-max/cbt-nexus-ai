import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Tests from "./pages/Tests";
import TestTaking from "./pages/TestTaking";
import Results from "./pages/Results";
import TestHistory from "./pages/TestHistory";
import GenerateTest from "./pages/GenerateTest";
import CustomTest from "./pages/CustomTest";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute><Tests /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><TestHistory /></ProtectedRoute>} />
            <Route path="/test/:testId" element={<ProtectedRoute><TestTaking /></ProtectedRoute>} />
            <Route path="/results/:attemptId" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/generate-test" element={<ProtectedRoute><GenerateTest /></ProtectedRoute>} />
            <Route path="/custom-test" element={<ProtectedRoute><CustomTest /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
