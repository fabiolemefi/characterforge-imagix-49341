import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminPlugins from "./pages/AdminPlugins";
import PluginDetails from "./pages/PluginDetails";
import Efimail from "./pages/Efimail";
import EmailBuilder from './pages/EmailBuilder';
import EmailTemplates from './pages/EmailTemplates';
import AdminEmailBlocks from './pages/AdminEmailBlocks';
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/plugin/:id" element={<ProtectedRoute><PluginDetails /></ProtectedRoute>} />
          <Route path="/efimail" element={<ProtectedRoute><Efimail /></ProtectedRoute>} />
          <Route path="/email-templates" element={<ProtectedRoute><EmailTemplates /></ProtectedRoute>} />
          <Route path="/email-builder" element={<ProtectedRoute><EmailBuilder /></ProtectedRoute>} />
          <Route path="/email-builder/:id" element={<ProtectedRoute><EmailBuilder /></ProtectedRoute>} />
          <Route path="/admin/email-blocks" element={<ProtectedRoute><AdminEmailBlocks /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute><AdminAnnouncements /></ProtectedRoute>} />
          <Route path="/admin/plugins" element={<ProtectedRoute><AdminPlugins /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
