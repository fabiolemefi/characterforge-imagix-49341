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
import AdminDocumentation from "./pages/AdminDocumentation";
import PluginDetails from "./pages/PluginDetails";
import Efimail from "./pages/Efimail";
import Efimagem from "./pages/Efimagem";
import EmailBuilder from './pages/EmailBuilder';
import EmailTemplates from './pages/EmailTemplates';
import AdminEmailBlocks from './pages/AdminEmailBlocks';
import TestsDashboard from './pages/TestsDashboard';
import TestsList from './pages/TestsList';
import TestForm from './pages/TestForm';
import BrandGuide from './pages/BrandGuide';
import BrandGuideHome from './pages/BrandGuideHome';
import AdminBrandGuide from './pages/AdminBrandGuide';
import AdminBrandGuidePage from './pages/AdminBrandGuidePage';
import AdminBrandGuideHome from './pages/AdminBrandGuideHome';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import AdminBlogCategories from './pages/AdminBlogCategories';
import AdminBlogPosts from './pages/AdminBlogPosts';
import Downloads from './pages/Downloads';
import ShareDownload from './pages/ShareDownload';
import EfiSlides from './pages/EfiSlides';
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // 5 minutos - dados permanecem "frescos"
      gcTime: 10 * 60 * 1000,
      // 10 minutos - dados permanecem em cache
      retry: 2,
      refetchOnWindowFocus: false,
      // Não recarregar ao voltar para a aba
      refetchOnMount: false // Não recarregar se dados estão em cache
    }
  }
});
const App = () => <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
          <Route path="/plugin/:id" element={<ProtectedRoute><AppLayout><PluginDetails /></AppLayout></ProtectedRoute>} />
          <Route path="/efimail" element={<ProtectedRoute><AppLayout><Efimail /></AppLayout></ProtectedRoute>} />
          <Route path="/efimagem" element={<ProtectedRoute><AppLayout><Efimagem /></AppLayout></ProtectedRoute>} />
          <Route path="/efi-slides" element={<ProtectedRoute><AppLayout><EfiSlides /></AppLayout></ProtectedRoute>} />
          <Route path="/email-templates" element={<ProtectedRoute><AppLayout><EmailTemplates /></AppLayout></ProtectedRoute>} />
          <Route path="/email-builder" element={<ProtectedRoute><AppLayout><EmailBuilder /></AppLayout></ProtectedRoute>} />
          <Route path="/email-builder/:id" element={<ProtectedRoute><AppLayout><EmailBuilder /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/email-blocks" element={<ProtectedRoute><AdminEmailBlocks /></ProtectedRoute>} />
          <Route path="/brand-guide" element={<ProtectedRoute><AppLayout><BrandGuideHome /></AppLayout></ProtectedRoute>} />
          <Route path="/brand-guide/:categorySlug" element={<ProtectedRoute><AppLayout><BrandGuide /></AppLayout></ProtectedRoute>} />
          <Route path="/brand-guide/:categorySlug/:pageSlug" element={<ProtectedRoute><AppLayout><BrandGuide /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/brand-guide" element={<ProtectedRoute><AdminBrandGuide /></ProtectedRoute>} />
          <Route path="/admin/brand-guide/home" element={<ProtectedRoute><AdminBrandGuideHome /></ProtectedRoute>} />
          <Route path="/admin/brand-guide/:categorySlug/:pageSlug" element={<ProtectedRoute><AdminBrandGuidePage /></ProtectedRoute>} />
          <Route path="/blog" element={<ProtectedRoute><AppLayout><Blog /></AppLayout></ProtectedRoute>} />
          <Route path="/blog/:slug" element={<ProtectedRoute><AppLayout><BlogPost /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/blog/categories" element={<ProtectedRoute><AdminBlogCategories /></ProtectedRoute>} />
          <Route path="/admin/blog/posts" element={<ProtectedRoute><AdminBlogPosts /></ProtectedRoute>} />
          <Route path="/tests" element={<ProtectedRoute><AppLayout><TestsDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/tests/list" element={<ProtectedRoute><AppLayout><TestsList /></AppLayout></ProtectedRoute>} />
          <Route path="/tests/new" element={<ProtectedRoute><AppLayout><TestForm /></AppLayout></ProtectedRoute>} />
          <Route path="/tests/:id/edit" element={<ProtectedRoute><AppLayout><TestForm /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/announcements" element={<ProtectedRoute><AdminAnnouncements /></ProtectedRoute>} />
          <Route path="/admin/plugins" element={<ProtectedRoute><AdminPlugins /></ProtectedRoute>} />
          <Route path="/admin/documentation" element={<ProtectedRoute><AdminDocumentation /></ProtectedRoute>} />
          <Route path="/downloads" element={<ProtectedRoute><AppLayout><Downloads /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
          <Route path="/share/file" element={<ShareDownload />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AuthProvider>;
export default App;