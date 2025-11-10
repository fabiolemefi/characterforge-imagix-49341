import { useState, useEffect, useMemo } from "react";
import { ChevronRight, HomeIcon, ChevronDown, Plug, Book, FileText, Download } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { usePlugins } from "@/hooks/usePlugins";
import { useBrandGuideCategories, useBrandGuidePages } from "@/hooks/useBrandGuideData";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

export function Sidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  // React Query hooks (com cache automático)
  const { data: plugins = [], isLoading: loadingPlugins, error: pluginsError } = usePlugins();
  const { data: categoriesData = [], isLoading: loadingCategories, error: categoriesError } = useBrandGuideCategories();
  const { data: pagesData = [], isLoading: loadingPages } = useBrandGuidePages();

  const [expandedBrandGuide, setExpandedBrandGuide] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string>("");

  // Combinar categorias com páginas
  const categories = useMemo(() => {
    return categoriesData.map(category => ({
      ...category,
      pages: pagesData.filter(page => page.category_id === category.id),
    }));
  }, [categoriesData, pagesData]);

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Auto-expand brand guide if on brand guide page
    if (currentPath.startsWith('/brand-guide')) {
      setExpandedBrandGuide(true);
      
      // Find and expand the correct category
      if (currentPath !== '/brand-guide') {
        const pathParts = currentPath.split('/').filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0] === 'brand-guide') {
          const categorySlug = pathParts[1];
          const category = categories.find(cat => cat.slug === categorySlug);
          if (category) {
            setExpandedCategoryId(category.id);
          }
        }
      }
    }
    
    // Auto-expand plugins if on plugin page
    if (currentPath.startsWith('/plugin') || currentPath === '/efimail' || currentPath === '/efimagem' || currentPath === '/email-templates') {
      setExpandedPlugins(true);
    }
  }, [location.pathname, categories]);

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Book;
    return <Icon className="h-4 w-4" />;
  };

  const isActive = (path: string) => location.pathname === path;
  const isPathActive = (path: string) => location.pathname.startsWith(path);

  const getPluginPath = (plugin: any) => {
    if (plugin.name === 'Efimail') return '/efimail';
    if (plugin.name === 'Efimagem') return '/efimagem';
    if (plugin.name === 'Email Builder') return '/email-templates';
    return `/plugin/${plugin.id}`;
  };

  return (
    <SidebarUI collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="border-b border-gray-800 px-4 py-3 bg-sidebar">
        <div className="flex items-center gap-2">
          {open && <span className="font-semibold text-white">Martech Efí</span>}
          {!open && <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-6 h-6" />}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup className="py-2 px-1">
          <SidebarMenu className="gap-1">
            {/* Principal */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/")}
                isActive={isActive("/")}
                tooltip="Principal"
                className="text-white hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-white"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Principal</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Blog */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/blog")}
                isActive={isPathActive("/blog")}
                tooltip="Blog"
                className="text-white hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-white"
              >
                <FileText className="h-4 w-4" />
                <span>Blog</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Brand Guide */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  setExpandedBrandGuide(!expandedBrandGuide);
                  navigate("/brand-guide");
                }}
                isActive={isPathActive("/brand-guide")}
                tooltip="Guia de Marca"
                className="text-white hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-white"
              >
                <Book className="h-4 w-4" />
                <span>Guia de Marca</span>
                {expandedBrandGuide ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedBrandGuide && (
                <SidebarMenuSub className="animate-in slide-in-from-top-2 duration-200">
                  {loadingCategories ? (
                    <SidebarMenuSubItem>
                      <div className="px-3 py-2 text-sm text-muted-foreground">Carregando...</div>
                    </SidebarMenuSubItem>
                  ) : categoriesError ? (
                    <SidebarMenuSubItem>
                      <div className="px-2 py-1">
                        <p className="text-xs text-destructive">Erro ao carregar categorias</p>
                        <button onClick={() => window.location.reload()} className="text-xs underline mt-1">
                          Tentar novamente
                        </button>
                      </div>
                    </SidebarMenuSubItem>
                  ) : (
                    categories.map(category => (
                      <SidebarMenuSubItem key={category.id}>
                        <SidebarMenuSubButton
                          onClick={() => setExpandedCategoryId(expandedCategoryId === category.id ? "" : category.id)}
                          isActive={location.pathname.includes(`/brand-guide/${category.slug}`)}
                          className="text-gray-300 hover:bg-accent hover:text-white data-[active=true]:bg-accent data-[active=true]:text-white"
                        >
                          {getIconComponent(category.icon)}
                          <span>{category.name}</span>
                          {category.pages && category.pages.length > 0 && (
                            expandedCategoryId === category.id
                              ? <ChevronDown className="ml-auto h-3 w-3" />
                              : <ChevronRight className="ml-auto h-3 w-3" />
                          )}
                        </SidebarMenuSubButton>

                        {expandedCategoryId === category.id && category.pages && category.pages.length > 0 && (
                          <SidebarMenuSub className="animate-in slide-in-from-top-2 duration-200">
                            {category.pages.map(page => (
                              <SidebarMenuSubItem key={page.id}>
                                <SidebarMenuSubButton
                                  onClick={() => navigate(`/brand-guide/${category.slug}/${page.slug}`)}
                                  isActive={location.pathname === `/brand-guide/${category.slug}/${page.slug}`}
                                  className="pl-8 text-gray-400 hover:bg-accent hover:text-white data-[active=true]:bg-accent data-[active=true]:text-white"
                                >
                                  {page.name}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuSubItem>
                    ))
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* Plugins */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setExpandedPlugins(!expandedPlugins)}
                isActive={isPathActive("/plugin") || isPathActive("/efimail") || isPathActive("/efimagem") || isPathActive("/email-templates")}
                tooltip="Plugins"
                className="text-white hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-white"
              >
                <Plug className="h-4 w-4" />
                <span>Plugins</span>
                {expandedPlugins ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedPlugins && (
                <SidebarMenuSub className="animate-in slide-in-from-top-2 duration-200">
                  {loadingPlugins ? (
                    <SidebarMenuSubItem>
                      <div className="px-3 py-2 text-sm text-muted-foreground">Carregando...</div>
                    </SidebarMenuSubItem>
                  ) : pluginsError ? (
                    <SidebarMenuSubItem>
                      <div className="px-2 py-1">
                        <p className="text-xs text-destructive">Erro ao carregar plugins</p>
                        <button onClick={() => window.location.reload()} className="text-xs underline mt-1">
                          Tentar novamente
                        </button>
                      </div>
                    </SidebarMenuSubItem>
                  ) : (
                    plugins.map(plugin => {
                      const pluginPath = getPluginPath(plugin);
                      return (
                        <SidebarMenuSubItem key={plugin.id}>
                          <SidebarMenuSubButton
                            onClick={() => navigate(pluginPath)}
                            isActive={location.pathname === pluginPath}
                            className="text-gray-300 hover:bg-accent hover:text-white data-[active=true]:bg-accent data-[active=true]:text-white"
                          >
                            <Plug className="h-3 w-3" />
                            <span>{plugin.name}</span>
                            {plugin.is_new && (
                              <span className="ml-auto bg-green-500 text-white text-[9px] px-1 py-0.5 rounded font-bold">
                                NEW
                              </span>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* Área para Download */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/downloads")}
                isActive={isActive("/downloads")}
                tooltip="Área para Download"
                className="text-white hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-white"
              >
                <Download className="h-4 w-4" />
                <span>Área para Download</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  );
}
