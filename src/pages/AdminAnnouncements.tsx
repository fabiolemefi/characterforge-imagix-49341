import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Announcement {
  id: string;
  message: string;
  color: string;
  start_date: string | null;
  end_date: string | null;
  is_immediate: boolean;
  is_active: boolean;
  created_at: string;
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    message: "",
    color: "#000000",
    start_date: "",
    end_date: "",
    is_immediate: false,
    is_active: true,
  });
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
    loadAnnouncements();
  };

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar comunicados",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar comunicado",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Comunicado atualizado",
          description: "O comunicado foi atualizado com sucesso",
        });
        setDialogOpen(false);
        resetForm();
        loadAnnouncements();
      }
    } else {
      const { error } = await supabase
        .from("announcements")
        .insert([payload]);

      if (error) {
        toast({
          title: "Erro ao criar comunicado",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Comunicado criado",
          description: "O comunicado foi criado com sucesso",
        });
        setDialogOpen(false);
        resetForm();
        loadAnnouncements();
      }
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      message: announcement.message,
      color: announcement.color,
      start_date: announcement.start_date ? announcement.start_date.split('T')[0] + 'T' + announcement.start_date.split('T')[1].substring(0, 5) : "",
      end_date: announcement.end_date ? announcement.end_date.split('T')[0] + 'T' + announcement.end_date.split('T')[1].substring(0, 5) : "",
      is_immediate: announcement.is_immediate,
      is_active: announcement.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este comunicado?")) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir comunicado",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Comunicado excluído",
        description: "O comunicado foi excluído com sucesso",
      });
      loadAnnouncements();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      message: "",
      color: "#000000",
      start_date: "",
      end_date: "",
      is_immediate: false,
      is_active: true,
    });
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
            <div className="flex items-center">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold ml-4">Comunicados</h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Comunicado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Comunicado" : "Novo Comunicado"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="message">Mensagem</Label>
                    <Input
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Cor</Label>
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_immediate"
                      checked={formData.is_immediate}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_immediate: checked as boolean })
                      }
                    />
                    <Label htmlFor="is_immediate">Comunicado Imediato</Label>
                  </div>
                  {!formData.is_immediate && (
                    <>
                      <div>
                        <Label htmlFor="start_date">Data/Hora de Início</Label>
                        <Input
                          id="start_date"
                          type="datetime-local"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">Data/Hora de Término</Label>
                        <Input
                          id="end_date"
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Ativo</Label>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </header>

          <main className="p-6">
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Imediato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : announcements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Nenhum comunicado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell>{announcement.message}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: announcement.color }}
                            />
                            {announcement.color}
                          </div>
                        </TableCell>
                        <TableCell>
                          {announcement.is_immediate ? "Sim" : "Não"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              announcement.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {announcement.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(announcement)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(announcement.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
