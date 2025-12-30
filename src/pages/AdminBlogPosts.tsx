import { useState, useRef } from "react";
import Header from "@/components/Header";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminBlogPosts, useAdminBlogCategories, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost, useUsers } from "@/hooks/useBlog";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { Plus, Pencil, Trash2, Eye, Upload, X, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AdminBlogPosts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    author_id: "",
    is_published: false,
  });

  const { data: posts, isLoading } = useAdminBlogPosts();
  const { data: categories } = useAdminBlogCategories();
  const { data: users } = useUsers();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, featured_image: publicUrl });
      toast({ title: "Sucesso", description: "Imagem enviada com sucesso" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Erro", description: error.message || "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, featured_image: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', formData);
    
    // Validação manual
    if (!formData.title.trim()) {
      toast({ title: "Erro", description: "O título é obrigatório", variant: "destructive" });
      return;
    }
    
    if (!formData.slug.trim()) {
      toast({ title: "Erro", description: "O slug é obrigatório", variant: "destructive" });
      return;
    }
    
    if (!formData.content.trim()) {
      toast({ title: "Erro", description: "O conteúdo é obrigatório", variant: "destructive" });
      return;
    }
    
    try {
      const postData = {
        ...formData,
        category_id: formData.category_id || null,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };
      
      console.log('Post data to submit:', postData);
      
      if (editingPost) {
        await updatePost.mutateAsync({ id: editingPost.id, ...postData });
      } else {
        await createPost.mutateAsync(postData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      featured_image: post.featured_image || "",
      category_id: post.category_id || "",
      author_id: post.author_id || "",
      is_published: post.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePost.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featured_image: "",
      category_id: "",
      author_id: "",
      is_published: false,
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col bg-background">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold">Posts do Blog</h1>
                <p className="text-muted-foreground">Gerencie os posts do blog</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPost ? "Editar Post" : "Novo Post"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Imagem de Destaque</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      {formData.featured_image ? (
                        <div className="mt-2 relative">
                          <img
                            src={formData.featured_image}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full mt-2 h-32 border-dashed"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Enviando...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
                            </div>
                          )}
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="excerpt">Resumo</Label>
                      <Textarea
                        id="excerpt"
                        value={formData.excerpt}
                        onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Conteúdo</Label>
                      <BlogEditor
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        placeholder="Digite o conteúdo do post..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="author">Autor</Label>
                      <Select
                        value={formData.author_id}
                        onValueChange={(value) => setFormData({ ...formData, author_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um autor" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_published"
                        checked={formData.is_published}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                      />
                      <Label htmlFor="is_published">Publicado</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={createPost.isPending || updatePost.isPending}>
                      {(createPost.isPending || updatePost.isPending) ? "Salvando..." : (editingPost ? "Atualizar" : "Criar")}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {posts?.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {post.title}
                          {post.is_published && (
                            <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">
                              Publicado
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {post.blog_categories?.name} • {post.slug}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {post.is_published && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/blog/${post.slug}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(post)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {post.excerpt && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </main>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
