import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, UserPlus, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  credits: number;
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCredits, setEditingCredits] = useState<{[key: string]: number}>({});
  const [editingJobTitle, setEditingJobTitle] = useState<{[key: string]: string}>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (error || !data) {
      navigate("/");
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área",
        variant: "destructive",
      });
      return;
    }

    setIsAdmin(true);
    loadProfiles();
  };

  const loadProfiles = async () => {
    setLoading(true);
    
    // Get all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({
        title: "Erro ao carregar usuários",
        description: profilesError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get all admin roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminIds = new Set(rolesData?.map(r => r.user_id) || []);

    // Merge the data
    const profilesWithAdmin = profilesData?.map(profile => ({
      ...profile,
      is_admin: adminIds.has(profile.id)
    })) || [];

    setProfiles(profilesWithAdmin);
    setLoading(false);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentStatus })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Usuário atualizado",
        description: `Usuário ${!currentStatus ? "ativado" : "desativado"} com sucesso`,
      });
      loadProfiles();
    }
  };

  const toggleAdminStatus = async (userId: string, currentIsAdmin: boolean) => {
    if (currentIsAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast({
          title: "Erro ao remover admin",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Admin removido",
          description: "Privilégios de admin foram removidos",
        });
        loadProfiles();
      }
    } else {
      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: "admin" }]);

      if (error) {
        toast({
          title: "Erro ao tornar admin",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Admin criado",
          description: "Usuário agora tem privilégios de admin",
        });
        loadProfiles();
      }
    }
  };

  const updateCredits = async (userId: string, credits: number) => {
    const { error } = await supabase
      .from("profiles")
      .update({ credits })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Erro ao atualizar créditos",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Créditos atualizados",
        description: "Os créditos foram atualizados com sucesso",
      });
      setEditingCredits(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
      loadProfiles();
    }
  };

  const updateJobTitle = async (userId: string, job_title: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ job_title })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Erro ao atualizar cargo",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cargo atualizado",
        description: "O cargo foi atualizado com sucesso",
      });
      setEditingJobTitle(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
      loadProfiles();
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Gerenciar Usuários</h1>
            </div>
            <Button onClick={() => {
              toast({
                title: "Em desenvolvimento",
                description: "Funcionalidade de adicionar usuário em breve",
              });
            }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </header>

          <main className="p-6">
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={profile.avatar_url || ""} />
                              <AvatarFallback>
                                {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{profile.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="Cargo"
                              value={editingJobTitle[profile.id] ?? profile.job_title ?? ""}
                              onChange={(e) => setEditingJobTitle(prev => ({
                                ...prev,
                                [profile.id]: e.target.value
                              }))}
                              className="w-40"
                            />
                            {editingJobTitle[profile.id] !== undefined && 
                             editingJobTitle[profile.id] !== (profile.job_title ?? "") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateJobTitle(profile.id, editingJobTitle[profile.id])}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingCredits[profile.id] ?? profile.credits}
                              onChange={(e) => setEditingCredits(prev => ({
                                ...prev,
                                [profile.id]: parseInt(e.target.value) || 0
                              }))}
                              className="w-24"
                            />
                            {editingCredits[profile.id] !== undefined && 
                             editingCredits[profile.id] !== profile.credits && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateCredits(profile.id, editingCredits[profile.id])}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {profile.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={profile.is_admin}
                            onCheckedChange={() =>
                              toggleAdminStatus(profile.id, profile.is_admin)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                toast({
                                  title: "Em desenvolvimento",
                                  description: "Funcionalidade de editar usuário em breve",
                                });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={profile.is_active}
                              onCheckedChange={() =>
                                toggleUserStatus(profile.id, profile.is_active)
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
