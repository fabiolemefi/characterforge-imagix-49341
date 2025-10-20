import { useState, useEffect } from "react";
import { ChevronRight, HomeIcon, ChevronDown, Plug, Book } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
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
}: SidebarItemProps) => <button className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${isActive ? 'bg-accent' : 'hover:bg-accent'}`} onClick={onClick}>
    <div className={isActive ? "text-white" : "text-gray-300"}>{icon}</div>
    <span className="text-white text-sm font-medium flex-1 text-left">{label}</span>
    {isNew && <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
        NEW
      </span>}
    {hasDropdown && (isActive ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />)}
  </button>;
const DropdownItem = ({
  icon,
  label,
  isExternal = false,
  isActive = false,
  onClick
}: DropdownItemProps) => <button className={`w-full flex items-center gap-3 p-3 pl-12 hover:bg-accent rounded-md transition-colors ${isActive ? 'bg-accent' : ''}`} onClick={onClick}>
    <div className={isActive ? "text-white" : "text-gray-300"}>{icon}</div>
    <span className={`text-sm ${isActive ? "text-white" : "text-gray-300"}`}>{label}</span>
    {isExternal && <span className="ml-2 px-1 bg-muted rounded-sm text-[10px] text-gray-300">↗</span>}
  </button>;
export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [brandGuideOpen, setBrandGuideOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState("");
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [categories, setCategories] = useState<BrandGuideCategory[]>([]);
  const [activeItem, setActiveItem] = useState("Principal");
  const [activeDropdownItem, setActiveDropdownItem] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    loadPlugins();
    loadBrandGuideCategories();
  }, []);
  const loadPlugins = async () => {
    const {
      data
    } = await supabase.from("plugins").select("*").eq("is_active", true).eq("in_development", false).order("name");
    if (data) {
      setPlugins(data);
    }
  };

  const loadBrandGuideCategories = async () => {
    const { data: categoriesData } = await supabase
      .from("brand_guide_categories")
      .select("*")
      .eq("is_active", true)
      .order("position");

    const { data: pagesData } = await supabase
      .from("brand_guide_pages")
      .select("*")
      .eq("is_active", true)
      .order("position");

    if (categoriesData && pagesData) {
      const categoriesWithPages = categoriesData.map((category) => ({
        ...category,
        pages: pagesData.filter((page) => page.category_id === category.id),
      }));
      setCategories(categoriesWithPages);
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Book;
    return <Icon size={20} />;
  };
  if (isCollapsed) {
    return <div className="w-16 bg-sidebar min-h-screen flex flex-col items-center py-4 border-r border-gray-800">
        <div className="mb-8">
          <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-8 h-8" />
        </div>
        <button onClick={() => setIsCollapsed(false)} className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>;
  }
  return <div className="w-[232px] bg-sidebar min-h-screen flex flex-col border-r border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          
          <span className="text-white font-semibold">Martech Efí
        </span>
        </div>
        <button onClick={() => setIsCollapsed(true)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="py-2 px-3 flex flex-col gap-1">
        <SidebarItem icon={<HomeIcon size={20} />} label="Principal" isActive={activeItem === "Principal"} onClick={() => {
        setActiveItem("Principal");
        navigate("/");
      }} />
        
        <SidebarItem icon={<Book size={20} />} label="Guia de Marca" isActive={activeItem === "BrandGuide"} hasDropdown onClick={() => {
        setBrandGuideOpen(!brandGuideOpen);
        setActiveItem("BrandGuide");
        navigate("/brand-guide");
      }} />

        {brandGuideOpen && <div className="mt-1 space-y-1">
            {categories.map(category => (
              <div key={category.id} className="space-y-1">
                <button 
                  className={`w-full flex items-center gap-3 p-3 pl-12 hover:bg-accent rounded-md transition-colors ${activeCategoryId === category.id && !activeDropdownItem ? 'bg-accent' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const willExpand = expandedCategoryId !== category.id;
                    setExpandedCategoryId(willExpand ? category.id : "");
                    setActiveCategoryId(category.id);
                    setActiveDropdownItem("");
                    navigate(`/brand-guide/${category.slug}`);
                  }}
                >
                  <div className={activeCategoryId === category.id && !activeDropdownItem ? "text-white" : "text-gray-300"}>
                    {getIconComponent(category.icon)}
                  </div>
                  <span className={`text-sm flex-1 text-left ${activeCategoryId === category.id && !activeDropdownItem ? "text-white" : "text-gray-300"}`}>
                    {category.name}
                  </span>
                  {category.pages && category.pages.length > 0 && (
                    expandedCategoryId === category.id 
                      ? <ChevronDown size={14} className="text-gray-300" />
                      : <ChevronRight size={14} className="text-gray-300" />
                  )}
                </button>
                
                {expandedCategoryId === category.id && category.pages && category.pages.length > 0 && (
                  <div className="space-y-1">
                    {category.pages.map(page => (
                      <button 
                        key={page.id}
                        className={`w-full flex items-center gap-3 p-2 pl-16 hover:bg-accent rounded-md transition-colors text-sm ${activeDropdownItem === page.id ? 'bg-accent text-white' : 'text-gray-400'}`}
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
          </div>}

        <SidebarItem icon={<Plug size={20} />} label="Plugins" isActive={activeItem === "Plugins"} hasDropdown onClick={() => {
        setPluginsOpen(!pluginsOpen);
        setActiveItem("Plugins");
      }} />

        {pluginsOpen && <div className="mt-1 space-y-1 animate-fade-in">
            {plugins.map(plugin => <DropdownItem key={plugin.id} icon={<Plug size={16} />} label={plugin.name} isActive={activeDropdownItem === plugin.id} onClick={() => {
          setActiveDropdownItem(plugin.id);
          navigate(`/plugin/${plugin.id}`);
        }} />)}
          </div>}
      </div>
    </div>;
};