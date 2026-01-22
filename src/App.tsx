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
import AdminAIAssistants from "./pages/AdminAIAssistants";
import AdminAIAssistantEdit from "./pages/AdminAIAssistantEdit";
import PluginDetails from "./pages/PluginDetails";
import Efimail from "./pages/Efimail";
import Efimagem from "./pages/Efimagem";
import EmailBuilder from './pages/EmailBuilder';
import EmailTemplates from './pages/EmailTemplates';
import EmailMagico from './pages/EmailMagico';
import EfiReport from './pages/EfiReport';
import AdminEmailMagico from './pages/AdminEmailMagico';
import AdminEfiReport from './pages/AdminEfiReport';
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
import CanvaBlocks from './pages/CanvaBlocks';
import CanvaEditor from './pages/CanvaEditor';
import BriefingsDashboard from './pages/BriefingsDashboard';
import BriefingsList from './pages/BriefingsList';
import BriefingForm from './pages/BriefingForm';
import NotFound from "./pages/NotFound";
import Metricas from "./pages/Metricas";
import EfiLink from "./pages/EfiLink";
import TestReportPublic from "./pages/TestReportPublic";
import JiraTasksDashboard from "./pages/JiraTasksDashboard";
import JiraTaskForm from "./pages/JiraTaskForm";
import JiraOkrs from "./pages/JiraOkrs";
import JiraTasksList from "./pages/JiraTasksList";
import AdminJira from "./pages/AdminJira";
import ImageCampaignPublic from "./pages/ImageCampaignPublic";
import AdminImageCampaigns from "./pages/AdminImageCampaigns";
import AdminSiteSettings from "./pages/AdminSiteSettings";
import EfiCode from "./pages/EfiCode";
import EfiCodeEditor from "./pages/EfiCodeEditor";
import EfiCodePreview from "./pages/EfiCodePreview";
import AdminEfiCodeBlocks from "./pages/AdminEfiCodeBlocks";
import Trilhas from "./pages/Trilhas";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";

// Configuração simplificada do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 30 * 60 * 1000,   // 30 minutos
      retry: 2,
      refetchOnWindowFocus: false, // Não refetch automático ao focar
      refetchOnMount: true,        // Sempre buscar ao montar
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
            <Route path="/plugin/:id" element={<ProtectedRoute><AppLayout><PluginDetails /></AppLayout></ProtectedRoute>} />
            <Route path="/efimail" element={<ProtectedRoute><AppLayout><Efimail /></AppLayout></ProtectedRoute>} />
            <Route path="/efimagem" element={<ProtectedRoute><AppLayout><Efimagem /></AppLayout></ProtectedRoute>} />
            <Route path="/efi-slides" element={<ProtectedRoute><AppLayout><EfiSlides /></AppLayout></ProtectedRoute>} />
            <Route path="/email-magico" element={<ProtectedRoute><AppLayout><EmailMagico /></AppLayout></ProtectedRoute>} />
            <Route path="/efi-report" element={<ProtectedRoute><AppLayout><EfiReport /></AppLayout></ProtectedRoute>} />
            <Route path="/efi-link" element={<ProtectedRoute><AppLayout><EfiLink /></AppLayout></ProtectedRoute>} />
            <Route path="/email-templates" element={<ProtectedRoute><AppLayout><EmailTemplates /></AppLayout></ProtectedRoute>} />
            <Route path="/email-builder" element={<ProtectedRoute><AppLayout><EmailBuilder /></AppLayout></ProtectedRoute>} />
            <Route path="/email-builder/:id" element={<ProtectedRoute><AppLayout><EmailBuilder /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/email-blocks" element={<ProtectedRoute><AdminEmailBlocks /></ProtectedRoute>} />
            <Route path="/admin/email-magico" element={<ProtectedRoute><AdminEmailMagico /></ProtectedRoute>} />
            <Route path="/admin/efi-report" element={<ProtectedRoute><AdminEfiReport /></ProtectedRoute>} />
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
            <Route path="/admin/configuracao" element={<ProtectedRoute><AdminSiteSettings /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute><AdminAnnouncements /></ProtectedRoute>} />
            <Route path="/admin/plugins" element={<ProtectedRoute><AdminPlugins /></ProtectedRoute>} />
            <Route path="/admin/documentation" element={<ProtectedRoute><AdminDocumentation /></ProtectedRoute>} />
            <Route path="/admin/ai-assistants" element={<ProtectedRoute><AdminAIAssistants /></ProtectedRoute>} />
            <Route path="/admin/ai-assistants/:id" element={<ProtectedRoute><AdminAIAssistantEdit /></ProtectedRoute>} />
            <Route path="/downloads" element={<ProtectedRoute><AppLayout><Downloads /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
            <Route path="/share/file" element={<ShareDownload />} />
            <Route path="/trilhas" element={<Trilhas />} />
            <Route path="/tests/report" element={<TestReportPublic />} />
            <Route path="/gerar/:slug" element={<ImageCampaignPublic />} />
            <Route path="/admin/gerar-imagens" element={<ProtectedRoute><AdminImageCampaigns /></ProtectedRoute>} />
            <Route path="/canva/blocos" element={<ProtectedRoute><AppLayout><CanvaBlocks /></AppLayout></ProtectedRoute>} />
            <Route path="/canva/editor" element={<ProtectedRoute><CanvaEditor /></ProtectedRoute>} />
            <Route path="/briefings" element={<ProtectedRoute><AppLayout><BriefingsDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/briefings/list" element={<ProtectedRoute><AppLayout><BriefingsList /></AppLayout></ProtectedRoute>} />
            <Route path="/briefings/new" element={<ProtectedRoute><AppLayout><BriefingForm /></AppLayout></ProtectedRoute>} />
            <Route path="/briefings/:id/edit" element={<ProtectedRoute><AppLayout><BriefingForm /></AppLayout></ProtectedRoute>} />
            <Route path="/metricas" element={<ProtectedRoute><AppLayout><Metricas /></AppLayout></ProtectedRoute>} />
            <Route path="/jira-tasks" element={<ProtectedRoute><AppLayout><JiraTasksDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/jira-tasks/new" element={<ProtectedRoute><AppLayout><JiraTaskForm /></AppLayout></ProtectedRoute>} />
            <Route path="/jira-tasks/okrs" element={<ProtectedRoute><AppLayout><JiraOkrs /></AppLayout></ProtectedRoute>} />
            <Route path="/jira-tasks/list" element={<ProtectedRoute><AppLayout><JiraTasksList /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/jira" element={<ProtectedRoute><AdminJira /></ProtectedRoute>} />
            <Route path="/efi-code" element={<ProtectedRoute><AppLayout><EfiCode /></AppLayout></ProtectedRoute>} />
            <Route path="/efi-code/:id" element={<ProtectedRoute><EfiCodeEditor /></ProtectedRoute>} />
            <Route path="/efi-code/:id/preview" element={<EfiCodePreview />} />
            <Route path="/admin/efi-code-blocks" element={<ProtectedRoute><AdminEfiCodeBlocks /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
