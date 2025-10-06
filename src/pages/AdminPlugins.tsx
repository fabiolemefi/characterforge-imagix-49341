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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Settings } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface Plugin {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_new: boolean;
  in_development: boolean;
  created_at: string;
}

export default function AdminPlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    is_active: true,
    is_new: false,
    in_development: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    loadPlugins();
  };

  const loadPlugins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar plugins",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPlugins(data || []);
    }
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('plugin-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('plugin-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imageUrl = formData.image_url;

    // If there's a new file selected, upload it
    if (selectedFile) {
      const uploadedUrl = await uploadImage(selectedFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        return; // Stop if upload failed
      }
    }

    const payload = {
      ...formData,
      image_url: imageUrl || null,
      description: formData.description || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("plugins")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar plugin",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Plugin atualizado",
          description: "O plugin foi atualizado com sucesso",
        });
        setDialogOpen(false);
        resetForm();
        loadPlugins();
      }
    } else {
      const { error } = await supabase
        .from("plugins")
        .insert([payload]);

      if (error) {
        toast({
          title: "Erro ao criar plugin",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Plugin criado",
          description: "O plugin foi criado com sucesso",
        });
        setDialogOpen(false);
        resetForm();
        loadPlugins();
      }
    }
  };

  const handleEdit = (plugin: Plugin) => {
    setEditingId(plugin.id);
    setFormData({
      name: plugin.name,
      description: plugin.description || "",
      image_url: plugin.image_url || "",
      is_active: plugin.is_active,
      is_new: plugin.is_new,
      in_development: plugin.in_development,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este plugin?")) return;

    const { error } = await supabase
      .from("plugins")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir plugin",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Plugin excluído",
        description: "O plugin foi excluído com sucesso",
      });
      loadPlugins();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      image_url: "",
      is_active: true,
      is_new: false,
      in_development: false,
    });
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
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
            <div className="flex items-center">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold ml-4">Plugins</h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plugin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Plugin" : "Novo Plugin"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="image_upload">Imagem do Plugin</Label>
                    <Input
                      id="image_upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    {formData.image_url && (
                      <div className="mt-2">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_new"
                      checked={formData.is_new}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_new: checked as boolean })
                      }
                    />
                    <Label htmlFor="is_new">Mostrar Badge "Novo"</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="in_development"
                      checked={formData.in_development}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, in_development: checked as boolean })
                      }
                    />
                    <Label htmlFor="in_development">Em Desenvolvimento</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={uploadingImage}>
                    {uploadingImage ? "Fazendo upload..." : editingId ? "Atualizar" : "Criar"}
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Imagem</TableHead>
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
                  ) : plugins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Nenhum plugin encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    plugins.map((plugin) => (
                      <TableRow key={plugin.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {plugin.name}
                            {plugin.is_new && <Badge variant="secondary">Novo</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {plugin.description || "-"}
                        </TableCell>
                        <TableCell>
                          {plugin.image_url ? (
                            <img
                              src={plugin.image_url}
                              alt={plugin.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              plugin.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {plugin.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {plugin.name === 'Email Builder' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate('/admin/email-blocks')}
                                title="Gerenciar blocos"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(plugin)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(plugin.id)}
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
