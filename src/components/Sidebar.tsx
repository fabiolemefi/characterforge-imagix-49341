import { useState, useEffect, memo, useCallback } from "react";
import { ChevronRight, HomeIcon, ChevronDown, Plug, Book, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { safeSupabaseQuery } from "@/lib/safeSupabaseQuery";
import { ErrorFallback } from "./ErrorFallback";

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

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isNew?: boolean;
  hasDropdown?: boolean;
  onClick?: () => void;
};

type DropdownItemProps = {
  icon: React.ReactNode;
  label: string;
  isExternal?: boolean;
  isActive?: boolean;
  onClick?: () => void;
};

const SidebarItem = ({
  icon,
  label,
  isActive = false,
  isNew = false,
  hasDropdown = false,
  onClick
}: SidebarItemProps) => (
  <button
    className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
      isActive ? 'bg-accent' : 'hover:bg-accent'
    }`}
    onClick={onClick}
  >
    <div className={isActive ? "text-white" : "text-gray-300"}>{icon}</div>
    <span className="text-white text-sm font-medium flex-1 text-left">{label}</span>
    {isNew && (
      <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
        NEW
      </span>
    )}
    {hasDropdown && (
      isActive ? (
        <ChevronDown size={16} className="text-gray-300" />
      ) : (
        <ChevronRight size={16} className="text-gray-300" />
      )
    )}
  </button>
);

const DropdownItem = ({
  icon,
  label,
  isExternal = false,
  isActive = false,
  onClick
}: DropdownItemProps) => (
  <button
    className={`w-full flex items-center gap-3 p-3 pl-12 hover:bg-accent rounded-md transition-colors ${
      isActive ? 'bg-accent' : ''
    }`}
    onClick={onClick}
  >
    <div className={isActive ? "text-white" : "text-gray-300"}>{icon}</div>
    <span className={`text-sm ${isActive ? "text-white" : "text-gray-300"}`}>{label}</span>
    {isExternal && (
      <span className="ml-2 px-1 bg-muted rounded-sm text-[10px] text-gray-300">↗</span>
    )}
  </button>
);

export const Sidebar = memo(() => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState("");
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [categories, setCategories] = useState<BrandGuideCategory[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [pluginsError, setPluginsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeItem, setActiveItem] = useState("Principal");
  const [activeDropdownItem, setActiveDropdownItem] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleBrandGuideClick = useCallback(() => {
    console.log('Sidebar: Guia de Marca clicked');
    setActiveItem("BrandGuide");
    const newMenuState = openMenu === "brand-guide" ? null : "brand-guide";
    console.log('Sidebar: Setting openMenu to:', newMenuState);
    setOpenMenu(newMenuState);
    // Close plugins when opening brand guide
    if (newMenuState === "brand-guide") {
      setActiveDropdownItem("");
      setExpandedCategoryId("");
      setActiveCategoryId("");
    }
    navigate("/brand-guide");
  }, [openMenu, navigate]);

  const handleBlogClick = useCallback(() => {
    console.log('Sidebar: Blog clicked');
    setActiveItem("Blog");
    setOpenMenu(null);
    navigate("/blog");
  }, [navigate]);

  const handlePluginsClick = useCallback(() => {
    console.log('Sidebar: Plugins clicked');
    setActiveItem("Plugins");
    const newMenuState = openMenu === "plugins" ? null : "plugins";
    console.log('Sidebar: Setting openMenu to:', newMenuState);
    setOpenMenu(newMenuState);
    // Don't navigate to plugins page, just open the menu
  }, [openMenu]);

  const handleCategoryClick = useCallback((categoryId: string, categorySlug: string) => {
    const willExpand = expandedCategoryId !== categoryId;
    setExpandedCategoryId(willExpand ? categoryId : "");
    setActiveCategoryId(categoryId);
    setActiveDropdownItem("");
  }, [expandedCategoryId]);

  const handlePageClick = useCallback((categoryId: string, categorySlug: string, pageSlug: string) => {
    setActiveCategoryId(categoryId);
    // Find the page by slug to set it as active
    const category = categories.find(cat => cat.id === categoryId);
    if (category && category.pages) {
      const page = category.pages.find(p => p.slug === pageSlug);
      if (page) {
        setActiveDropdownItem(page.id);
      }
    }
    navigate(`/brand-guide/${categorySlug}/${pageSlug}`);
  }, [categories, navigate]);

  useEffect(() => {
    if (!dataLoaded) {
      loadPlugins();
      loadBrandGuideCategories();
    }
  }, [dataLoaded]);

  useEffect(() => {
    const currentPath = location.pathname;
    console.log('Sidebar: Location changed:', currentPath);

    if (currentPath.startsWith('/blog')) {
      console.log('Sidebar: Setting to Blog');
      setActiveItem("Blog");
      setOpenMenu(null);
    } else if (currentPath.startsWith('/brand-guide')) {
      console.log('Sidebar: Setting to BrandGuide');
      setActiveItem("BrandGuide");
      setOpenMenu("brand-guide");

      // If it's a specific page within brand-guide, find and expand the correct category and page
      if (currentPath !== '/brand-guide') {
        const pathParts = currentPath.split('/').filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0] === 'brand-guide') {
          const categorySlug = pathParts[1];
          const pageSlug = pathParts.length >= 3 ? pathParts[2] : null;

          // Find the category and expand it
          const category = categories.find(cat => cat.slug === categorySlug);
          if (category) {
            setExpandedCategoryId(category.id);
            setActiveCategoryId(category.id);

            // If there's a page slug, find and set the active page
            if (pageSlug && category.pages) {
              const page = category.pages.find(p => p.slug === pageSlug);
              if (page) {
                setActiveDropdownItem(page.id);
              }
            } else {
              setActiveDropdownItem("");
            }
          }
        }
      }
    } else if (currentPath.startsWith('/plugin') || currentPath === '/efimail' || currentPath === '/efimagem' || currentPath === '/email-templates') {
      // Check if this path maps to a plugin
      const pluginPaths = ['/efimail', '/efimagem', '/email-templates'];
      if (pluginPaths.includes(currentPath) || currentPath.startsWith('/plugin')) {
        console.log('Sidebar: Setting to Plugins');
        setActiveItem("Plugins");
        setOpenMenu("plugins");

        // Find the active plugin based on the path
        if (plugins.length > 0) {
          let activePluginId = "";
          if (currentPath === '/efimail') {
            activePluginId = plugins.find(p => p.name === 'Efimail')?.id || "";
          } else if (currentPath === '/efimagem') {
            activePluginId = plugins.find(p => p.name === 'Efimagem')?.id || "";
          } else if (currentPath === '/email-templates') {
            activePluginId = plugins.find(p => p.name === 'Email Builder')?.id || "";
          } else if (currentPath.startsWith('/plugin/')) {
            const pluginId = currentPath.split('/plugin/')[1];
            activePluginId = pluginId || "";
          }
          setActiveDropdownItem(activePluginId);
        }
      }
    } else {
      console.log('Sidebar: Setting to Principal');
      setActiveItem("Principal");
      setOpenMenu(null);
    }
  }, [location.pathname, categories, plugins]);

  const loadPlugins = async () => {
    console.log('Sidebar: Loading plugins...');
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
      console.log('Sidebar: Plugins loaded:', result.data.length);
      setPlugins(result.data);
      setPluginsError(null);
    } else {
      console.error('Sidebar: Failed to load plugins:', result.error);
      setPluginsError(result.error?.message || 'Erro ao carregar plugins');
    }

    setLoadingPlugins(false);
    if (!dataLoaded) {
      setDataLoaded(true);
    }
  };

  const loadBrandGuideCategories = async () => {
    console.log('Sidebar: Loading categories...');
    setLoadingCategories(true);
    setCategoriesError(null);

    // Carregar categorias
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
      console.error('Sidebar: Failed to load categories:', categoriesResult.error);
      setCategoriesError(categoriesResult.error?.message || 'Erro ao carregar categorias');
      setLoadingCategories(false);
      return;
    }

    // Carregar páginas
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
      console.error('Sidebar: Failed to load pages:', pagesResult.error);
      setCategoriesError(pagesResult.error?.message || 'Erro ao carregar páginas');
      setLoadingCategories(false);
      return;
    }

    // Combinar dados
    if (categoriesResult.data && pagesResult.data) {
      const categoriesWithPages = categoriesResult.data.map((category: any) => ({
        ...category,
        pages: pagesResult.data.filter((page: any) => page.category_id === category.id),
      }));
      console.log('Sidebar: Categories loaded:', categoriesWithPages.length);
      setCategories(categoriesWithPages);
      setCategoriesError(null);
    }

    setLoadingCategories(false);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Book;
    return <Icon size={20} />;
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-sidebar min-h-screen flex flex-col items-center py-4 border-r border-gray-800">
        <div className="mb-8">
          <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-8 h-8" />
        </div>
        <button onClick={() => setIsCollapsed(false)} className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[232px] bg-sidebar min-h-screen flex flex-col border-r border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">Martech Efí</span>
        </div>
        <button onClick={() => setIsCollapsed(true)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="py-2 px-3 flex flex-col gap-1">
        <SidebarItem
          icon={<HomeIcon size={20} />}
          label="Principal"
          isActive={activeItem === "Principal"}
          onClick={() => {
            setActiveItem("Principal");
            navigate("/");
          }}
        />

        <SidebarItem
          icon={<FileText size={20} />}
          label="Blog"
          isActive={activeItem === "Blog"}
          onClick={handleBlogClick}
        />

        <SidebarItem
          icon={<Book size={20} />}
          label="Guia de Marca"
          isActive={activeItem === "BrandGuide"}
          hasDropdown
          onClick={handleBrandGuideClick}
        />

        {openMenu === "brand-guide" && (
          <div className="mt-1 space-y-1 animate-fade-in">
            {categories.map(category => (
              <div key={category.id} className="space-y-1">
                <button
                  className={`w-full flex items-center gap-3 p-3 pl-12 hover:bg-accent rounded-md transition-colors ${
                    activeCategoryId === category.id && !activeDropdownItem ? 'bg-accent' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const willExpand = expandedCategoryId !== category.id;
                    setExpandedCategoryId(willExpand ? category.id : "");
                    setActiveCategoryId(category.id);
                    setActiveDropdownItem("");
                    // Removed navigate call to prevent page navigation
                  }}
                >
                  <div className={
                    activeCategoryId === category.id && !activeDropdownItem ? "text-white" : "text-gray-300"
                  }>
                    {getIconComponent(category.icon)}
                  </div>
                  <span className={`text-sm flex-1 text-left ${
                    activeCategoryId === category.id && !activeDropdownItem ? "text-white" : "text-gray-300"
                  }`}>
                    {category.name}
                  </span>
                  {category.pages && category.pages.length > 0 && (
                    expandedCategoryId === category.id
                      ? <ChevronDown size={14} className="text-gray-300" />
                      : <ChevronRight size={14} className="text-gray-300" />
                  )}
                </button>

                {expandedCategoryId === category.id && category.pages && category.pages.length > 0 && (
                  <div className="space-y-1 animate-fade-in ml-4">
                    {category.pages.map(page => (
                      <button
                        key={page.id}
                        className={`w-full flex items-center gap-3 p-2 pl-12 hover:bg-accent rounded-md transition-colors text-sm ${
                          activeDropdownItem === page.id ? 'bg-accent text-white' : 'text-gray-400'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategoryId(category.id);
                          setActiveDropdownItem(page.id);
                          navigate(`/brand-guide/${category.slug}/${page.slug}`);
                        }}
                      >
                        {page.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <SidebarItem
          icon={<Plug size={20} />}
          label="Plugins"
          isActive={activeItem === "Plugins"}
          hasDropdown
          onClick={handlePluginsClick}
        />

        {openMenu === "plugins" && (
          <div className="mt-1 space-y-1 animate-fade-in">
            {loadingPlugins ? (
              <div className="space-y-2 p-2">
                <div className="flex items-center gap-3 p-3 rounded-md animate-pulse">
                  <div className="w-4 h-4 bg-gray-700 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-700 rounded"></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md animate-pulse">
                  <div className="w-4 h-4 bg-gray-700 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-700 rounded"></div>
                </div>
              </div>
            ) : pluginsError ? (
              <div className="px-3 py-2">
                <ErrorFallback
                  title="Erro ao carregar plugins"
                  message={pluginsError}
                  onRetry={loadPlugins}
                  showTechnicalDetails={false}
                />
              </div>
            ) : plugins.length > 0 ? (
              plugins.map(plugin => (
                <DropdownItem
                  key={plugin.id}
                  icon={<Plug size={16} />}
                  label={plugin.name}
                  isActive={activeDropdownItem === plugin.id}
                  onClick={() => {
                    setActiveDropdownItem(plugin.id);
                    navigate(`/plugin/${plugin.id}`);
                  }}
                />
              ))
            ) : (
              <div className="text-center py-2 text-gray-400 text-sm">
                Nenhum plugin encontrado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
