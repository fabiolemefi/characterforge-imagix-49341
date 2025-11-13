import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Edit } from "lucide-react";
import { AddUserModal } from "@/components/AddUserModal";
import { EditUserModal } from "@/components/EditUserModal";
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
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
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

  const handleEditUser = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditUserModalOpen(true);
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
            <Button onClick={() => setAddUserModalOpen(true)}>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
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
                        <TableCell>{profile.job_title || "-"}</TableCell>
                        <TableCell>
                          {new Date(profile.created_at).toLocaleDateString('pt-BR')}
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.is_admin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {profile.is_admin ? "Admin" : "Usuário"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditUser(profile)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
      
      <AddUserModal
        open={addUserModalOpen}
        onOpenChange={setAddUserModalOpen}
        onUserAdded={loadProfiles}
      />
      
      <EditUserModal
        open={editUserModalOpen}
        onOpenChange={setEditUserModalOpen}
        profile={selectedProfile}
        onUserUpdated={loadProfiles}
      />
    </SidebarProvider>
  );
}
