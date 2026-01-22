import { Users, LayoutDashboard, Megaphone, Puzzle, Home, Book, FileText, FolderOpen, BookOpen, Bot, SquareKanban, ImagePlus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Configuração Geral",
    url: "/admin/configuracao",
    icon: Settings,
  },
  {
    title: "Usuários",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Comunicados",
    url: "/admin/announcements",
    icon: Megaphone,
  },
  {
    title: "Assistentes IA",
    url: "/admin/ai-assistants",
    icon: Bot,
  },
  {
    title: "Jira",
    url: "/admin/jira",
    icon: SquareKanban,
  },
  {
    title: "Gerar Imagens",
    url: "/admin/gerar-imagens",
    icon: ImagePlus,
  },
  {
    title: "Guia de Marca",
    url: "/admin/brand-guide",
    icon: Book,
  },
  {
    title: "Categorias do Blog",
    url: "/admin/blog/categories",
    icon: FolderOpen,
  },
  {
    title: "Posts do Blog",
    url: "/admin/blog/posts",
    icon: FileText,
  },
  {
    title: "Plugins",
    url: "/admin/plugins",
    icon: Puzzle,
  },
  {
    title: "Documentação",
    url: "/admin/documentation",
    icon: BookOpen,
  },
];


export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    className="hover:bg-muted"
                  >
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Home</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
