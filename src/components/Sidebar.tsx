
import { useState } from "react";
import { ChevronRight, HomeIcon, Users, Video, Image, Edit, Palette, Grid, LayoutGrid, Rss, Code, ChevronDown, BookOpen, HelpCircle, Sparkles, Palette as ThemeIcon, Newspaper, Clock, Bookmark, Heart, Album, Boxes } from "lucide-react";

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

const SidebarItem = ({ icon, label, isActive = false, isNew = false, hasDropdown = false, onClick }: SidebarItemProps) => (
  <button 
    className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${isActive ? 'bg-accent' : 'hover:bg-accent'}`}
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
      isActive ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />
    )}
  </button>
);

const DropdownItem = ({ icon, label, isExternal = false, isActive = false, onClick }: DropdownItemProps) => (
  <button 
    className={`w-full flex items-center gap-3 p-3 pl-12 hover:bg-accent rounded-md transition-colors ${isActive ? 'bg-accent' : ''}`}
    onClick={onClick}
  >
    <div className={isActive ? "text-white" : "text-gray-300"}>{icon}</div>
    <span className={`text-sm ${isActive ? "text-white" : "text-gray-300"}`}>{label}</span>
    {isExternal && <span className="ml-2 px-1 bg-muted rounded-sm text-[10px] text-gray-300">↗</span>}
  </button>
);

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [myStuffOpen, setMyStuffOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Home");
  const [activeDropdownItem, setActiveDropdownItem] = useState("");

  if (isCollapsed) {
    return (
      <div className="w-16 bg-sidebar min-h-screen flex flex-col items-center py-4 border-r border-gray-800">
        <div className="mb-8">
          <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-8 h-8" />
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[232px] bg-sidebar min-h-screen flex flex-col border-r border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <img src="/lovable-uploads/407e5ec8-9b67-42ee-acf0-b238e194aa64.png" alt="Logo" className="w-8 h-8" />
          <span className="text-white font-semibold">OpenArt</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="py-2 px-3 flex flex-col gap-1">
        <SidebarItem 
          icon={<HomeIcon size={20} />} 
          label="Home" 
          isActive={activeItem === "Home"}
          onClick={() => setActiveItem("Home")}
        />
        <SidebarItem 
          icon={<Users size={20} />} 
          label="Characters" 
          isNew 
          isActive={activeItem === "Characters"}
          onClick={() => setActiveItem("Characters")}
        />
        <SidebarItem 
          icon={<Video size={20} />} 
          label="Videos" 
          isActive={activeItem === "Videos"}
          onClick={() => setActiveItem("Videos")}
        />
        <SidebarItem 
          icon={<Image size={20} />} 
          label="Create Image" 
          isActive={activeItem === "Create Image"}
          onClick={() => setActiveItem("Create Image")}
        />
        <SidebarItem 
          icon={<Edit size={20} />} 
          label="Edit Image" 
          isActive={activeItem === "Edit Image"}
          onClick={() => setActiveItem("Edit Image")}
        />
        <SidebarItem 
          icon={<Palette size={20} />} 
          label="Style Palettes" 
          isActive={activeItem === "Style Palettes"}
          onClick={() => setActiveItem("Style Palettes")}
        />
        <SidebarItem 
          icon={<Grid size={20} />} 
          label="Models" 
          isActive={activeItem === "Models"}
          onClick={() => setActiveItem("Models")}
        />
        <SidebarItem 
          icon={<LayoutGrid size={20} />} 
          label="Apps" 
          isActive={activeItem === "Apps"}
          onClick={() => setActiveItem("Apps")}
        />
        <SidebarItem 
          icon={<Rss size={20} />} 
          label="Community Feed" 
          isActive={activeItem === "Community Feed"}
          onClick={() => setActiveItem("Community Feed")}
        />
        <SidebarItem 
          icon={<Code size={20} />} 
          label="ComfyUI Workflows" 
          isActive={activeItem === "ComfyUI Workflows"}
          onClick={() => setActiveItem("ComfyUI Workflows")}
        />
      </div>

      <div className="flex-grow overflow-auto">
        <div className="py-2 px-3">
          <SidebarItem 
            icon={myStuffOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            label="My stuff" 
            isActive={activeItem === "My stuff"}
            hasDropdown
            onClick={() => {
              setMyStuffOpen(!myStuffOpen);
              setActiveItem("My stuff");
            }}
          />

          {myStuffOpen && (
            <div className="mt-1 space-y-1 animate-fade-in">
              <DropdownItem 
                icon={<Clock size={16} />} 
                label="Creation History" 
                isActive={activeDropdownItem === "Creation History"}
                onClick={() => setActiveDropdownItem("Creation History")}
              />
              <DropdownItem 
                icon={<Bookmark size={16} />} 
                label="Bookmarks" 
                isActive={activeDropdownItem === "Bookmarks"}
                onClick={() => setActiveDropdownItem("Bookmarks")}
              />
              <DropdownItem 
                icon={<Heart size={16} />} 
                label="Liked" 
                isActive={activeDropdownItem === "Liked"}
                onClick={() => setActiveDropdownItem("Liked")}
              />
              <DropdownItem 
                icon={<Album size={16} />} 
                label="Saved Albums" 
                isActive={activeDropdownItem === "Saved Albums"}
                onClick={() => setActiveDropdownItem("Saved Albums")}
              />
              <DropdownItem 
                icon={<Boxes size={16} />} 
                label="Trained Models" 
                isActive={activeDropdownItem === "Trained Models"}
                onClick={() => setActiveDropdownItem("Trained Models")}
              />
            </div>
          )}
        </div>

        <div className="py-2 px-3">
          <SidebarItem 
            icon={resourcesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            label="Resources" 
            hasDropdown
            isActive={activeItem === "Resources"}
            onClick={() => {
              setResourcesOpen(!resourcesOpen);
              setActiveItem("Resources");
            }}
          />
          
          {resourcesOpen && (
            <div className="mt-1 space-y-1 animate-fade-in">
              <DropdownItem 
                icon={<BookOpen size={16} />} 
                label="Tutorials" 
                isActive={activeDropdownItem === "Tutorials"}
                onClick={() => setActiveDropdownItem("Tutorials")}
              />
              <DropdownItem 
                icon={<HelpCircle size={16} />} 
                label="Wiki" 
                isExternal 
                isActive={activeDropdownItem === "Wiki"}
                onClick={() => setActiveDropdownItem("Wiki")}
              />
              <DropdownItem 
                icon={<HelpCircle size={16} />} 
                label="Help Center" 
                isActive={activeDropdownItem === "Help Center"}
                onClick={() => setActiveDropdownItem("Help Center")}
              />
              <DropdownItem 
                icon={<Sparkles size={16} />} 
                label="What's New" 
                isActive={activeDropdownItem === "What's New"}
                onClick={() => setActiveDropdownItem("What's New")}
              />
              <DropdownItem 
                icon={<ThemeIcon size={16} />} 
                label="Theme Gallery" 
                isActive={activeDropdownItem === "Theme Gallery"}
                onClick={() => setActiveDropdownItem("Theme Gallery")}
              />
              <DropdownItem 
                icon={<Newspaper size={16} />} 
                label="Blog" 
                isExternal 
                isActive={activeDropdownItem === "Blog"}
                onClick={() => setActiveDropdownItem("Blog")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
