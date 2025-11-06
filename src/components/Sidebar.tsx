import { useState, useEffect, useCallback } from "react";
import { ChevronRight, HomeIcon, ChevronDown, Plug, Book, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { safeSupabaseQuery } from "@/lib/safeSupabaseQuery";
import { ErrorFallback } from "./ErrorFallback";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

interface Plugin {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_new: boolean;
  in_development: boolean;
}

interface BrandGuideCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  position: number;
  pages?: BrandGuidePage[];
}

interface BrandGuidePage {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  position: number;
}

export function Sidebar() {
  const { open } = useSidebar();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [categories, setCategories] = useState<BrandGuideCategory[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [pluginsError, setPluginsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [expandedBrandGuide, setExpandedBrandGuide] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadPlugins();
    loadBrandGuideCategories();
  }, []);

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

  const loadPlugins = async () => {
    setLoadingPlugins(true);
    setPluginsError(null);

    const result = await safeSupabaseQuery<Plugin[]>(
      async () => {
        const { data, error } = await supabase
          .from("plugins")
          .select("*")
          .eq("is_active", true)
          .eq("in_development", false)
          .order("name");
        return { data, error };
      },
      {
        timeout: 15000,
        maxRetries: 3,
        operationName: 'Load Plugins (Sidebar)'
      }
    );

    if (result.success && result.data) {
      setPlugins(result.data);
      setPluginsError(null);
    } else {
      setPluginsError(result.error?.message || 'Erro ao carregar plugins');
    }

    setLoadingPlugins(false);
  };

  const loadBrandGuideCategories = async () => {
    setLoadingCategories(true);
    setCategoriesError(null);

    const categoriesResult = await safeSupabaseQuery<BrandGuideCategory[]>(
      async () => {
        const { data, error } = await supabase
          .from("brand_guide_categories")
          .select("*")
          .eq("is_active", true)
          .order("position");
        return { data, error };
      },
      {
        timeout: 15000,
        maxRetries: 3,
        operationName: 'Load Brand Guide Categories (Sidebar)'
      }
    );

    if (!categoriesResult.success) {
      setCategoriesError(categoriesResult.error?.message || 'Erro ao carregar categorias');
      setLoadingCategories(false);
      return;
    }

    const pagesResult = await safeSupabaseQuery<BrandGuidePage[]>(
      async () => {
        const { data, error } = await supabase
          .from("brand_guide_pages")
          .select("*")
          .eq("is_active", true)
          .order("position");
        return { data, error };
      },
      {
        timeout: 15000,
        maxRetries: 3,
        operationName: 'Load Brand Guide Pages (Sidebar)'
      }
    );

    if (!pagesResult.success) {
      setCategoriesError(pagesResult.error?.message || 'Erro ao carregar páginas');
      setLoadingCategories(false);
      return;
    }

    if (categoriesResult.data && pagesResult.data) {
      const categoriesWithPages = categoriesResult.data.map((category: any) => ({
        ...category,
        pages: pagesResult.data.filter((page: any) => page.category_id === category.id),
      }));
      setCategories(categoriesWithPages);
      setCategoriesError(null);
    }

    setLoadingCategories(false);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Book;
    return <Icon className="h-4 w-4" />;
  };

  const isActive = (path: string) => location.pathname === path;
  const isPathActive = (path: string) => location.pathname.startsWith(path);

  const getPluginPath = (plugin: Plugin) => {
    if (plugin.name === 'Efimail') return '/efimail';
    if (plugin.name === 'Efimagem') return '/efimagem';
    if (plugin.name === 'Email Builder') return '/email-templates';
    return `/plugin/${plugin.id}`;
  };

  return (
    <SidebarUI collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {open && <span className="font-semibold text-sidebar-foreground">Martech Efí</span>}
          {!open && <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-6 h-6" />}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* Principal */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/")}
                isActive={isActive("/")}
                tooltip="Principal"
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
              >
                <Book className="h-4 w-4" />
                <span>Guia de Marca</span>
                {expandedBrandGuide ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedBrandGuide && (
                <SidebarMenuSub>
                  {loadingCategories ? (
                    <SidebarMenuSubItem>
                      <div className="px-3 py-2 text-sm text-muted-foreground">Carregando...</div>
                    </SidebarMenuSubItem>
                  ) : categoriesError ? (
                    <SidebarMenuSubItem>
                      <div className="px-2 py-1">
                        <p className="text-xs text-destructive">{categoriesError}</p>
                        <button onClick={loadBrandGuideCategories} className="text-xs underline mt-1">
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
                          <SidebarMenuSub>
                            {category.pages.map(page => (
                              <SidebarMenuSubItem key={page.id}>
                                <SidebarMenuSubButton
                                  onClick={() => navigate(`/brand-guide/${category.slug}/${page.slug}`)}
                                  isActive={location.pathname === `/brand-guide/${category.slug}/${page.slug}`}
                                  className="pl-8"
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
              >
                <Plug className="h-4 w-4" />
                <span>Plugins</span>
                {expandedPlugins ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedPlugins && (
                <SidebarMenuSub>
                  {loadingPlugins ? (
                    <SidebarMenuSubItem>
                      <div className="px-3 py-2 text-sm text-muted-foreground">Carregando...</div>
                    </SidebarMenuSubItem>
                  ) : pluginsError ? (
                    <SidebarMenuSubItem>
                      <div className="px-2 py-1">
                        <p className="text-xs text-destructive">{pluginsError}</p>
                        <button onClick={loadPlugins} className="text-xs underline mt-1">
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
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  );
}
