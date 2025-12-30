import { useState, useEffect, useMemo } from "react";
import { ChevronRight, HomeIcon, ChevronDown, Plug, Book, FileText, Download, FlaskConical, Palette, LayoutGrid, FileEdit, PenTool, BarChart3, ExternalLink } from "lucide-react";
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
  const [expandedTests, setExpandedTests] = useState(false);
  const [expandedCanva, setExpandedCanva] = useState(false);
  const [expandedBriefings, setExpandedBriefings] = useState(false);
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
    if (currentPath.startsWith('/plugin') || currentPath === '/efimail' || currentPath === '/efimagem' || currentPath === '/email-templates' || currentPath === '/efi-slides' || currentPath === '/email-magico' || currentPath === '/efi-report' || currentPath === '/efi-link') {
      setExpandedPlugins(true);
    }
    
    // Auto-expand tests if on tests page
    if (currentPath.startsWith('/tests')) {
      setExpandedTests(true);
    }

    // Auto-expand canva if on canva page
    if (currentPath.startsWith('/canva')) {
      setExpandedCanva(true);
    }

    // Auto-expand briefings if on briefings page
    if (currentPath.startsWith('/briefings')) {
      setExpandedBriefings(true);
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
    if (plugin.name === 'Efi Slides') return '/efi-slides';
    if (plugin.name === 'Email mágico') return '/email-magico';
    if (plugin.name === 'Efí Report') return '/efi-report';
    if (plugin.name === 'Efilink') return '/efi-link';
    return `/plugin/${plugin.id}`;
  };

  return (
    <SidebarUI collapsible="icon" className="select-none p-4">
      <SidebarContent className="">
    <SidebarGroup>
          <SidebarMenu className="gap-1">
            {/* Principal */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  navigate("/");
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                isActive={isActive("/")}
                tooltip="Principal"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Principal</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Blog */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  navigate("/blog");
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                isActive={isPathActive("/blog")}
                tooltip="Blog"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
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
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                isActive={isPathActive("/brand-guide")}
                tooltip="Guia de Marca"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
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
                          className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
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
                                  onClick={() => {
                                    navigate(`/brand-guide/${category.slug}/${page.slug}`);
                                    window.scrollTo({ top: 0, behavior: 'instant' });
                                  }}
                                  isActive={location.pathname === `/brand-guide/${category.slug}/${page.slug}`}
                                  className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-2"
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
                isActive={isPathActive("/plugin") || isPathActive("/efimail") || isPathActive("/efimagem") || isPathActive("/email-templates") || isPathActive("/efi-slides")}
                tooltip="Plugins"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
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
                          onClick={() => {
                            navigate(pluginPath);
                            window.scrollTo({ top: 0, behavior: 'instant' });
                          }}
                          isActive={location.pathname === pluginPath}
                          className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                        >
                          <span>{plugin.name}</span>
                            {plugin.is_new && (
                              <span className="ml-auto bg-primary text-primary-foreground text-[7px] px-1 py-0 rounded font-bold">
                                NOVO
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
                onClick={() => {
                  navigate("/downloads");
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                isActive={isActive("/downloads")}
                tooltip="Área para Download"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Download className="h-4 w-4" />
                <span>Área para Download</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Métricas */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  navigate("/metricas");
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                isActive={isActive("/metricas")}
                tooltip="Métricas"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Métricas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Cadastro de Testes */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setExpandedTests(!expandedTests)}
                isActive={isPathActive("/tests")}
                tooltip="Cadastro de Testes"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <FlaskConical className="h-4 w-4" />
                <span>Cadastro de Testes</span>
                {expandedTests ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedTests && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/tests");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={isActive("/tests")}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <span>Dashboard</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/tests/list");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={location.pathname.startsWith("/tests/list") || location.pathname.startsWith("/tests/new") || location.pathname.includes("/tests/") && location.pathname.includes("/edit")}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <span>Testes</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/blog/framework-de-testes");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={location.pathname === "/blog/framework-de-testes"}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <span>Guia Framework de teste</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* Cadastro de Briefing */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setExpandedBriefings(!expandedBriefings)}
                isActive={isPathActive("/briefings")}
                tooltip="Cadastro de Briefing"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <FileEdit className="h-4 w-4" />
                <span>Cadastro de Briefing</span>
                {expandedBriefings ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedBriefings && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/briefings");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={isActive("/briefings")}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <span>Dashboard</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/briefings/list");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={location.pathname.startsWith("/briefings/list") || location.pathname.startsWith("/briefings/new") || location.pathname.includes("/briefings/") && location.pathname.includes("/edit")}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <span>Briefings</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* Canva */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setExpandedCanva(!expandedCanva)}
                isActive={isPathActive("/canva")}
                tooltip="Canva"
                className="cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Palette className="h-4 w-4" />
                <span>Canva</span>
                {expandedCanva ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
              </SidebarMenuButton>

              {expandedCanva && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/canva/editor");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={isActive("/canva/editor")}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <PenTool className="h-3 w-3 mr-2" />
                      <span>Editor</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => {
                        navigate("/canva/blocos");
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      isActive={isActive("/canva/blocos")}
                      className="cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-0.5 px-6"
                    >
                      <LayoutGrid className="h-3 w-3 mr-2" />
                      <span>Blocos</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  );
}
