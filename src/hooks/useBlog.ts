import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BlogPost = {
  id: string;
  category_id: string | null;
  author_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  blog_categories?: BlogCategory | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
  } | null;
};

export const useBlogCategories = () => {
  return useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .eq("is_active", true)
        .order("position");

      if (error) throw error;
      return data as BlogCategory[];
    },
  });
};

export const useBlogPosts = (categorySlug?: string) => {
  return useQuery({
    queryKey: ["blog-posts", categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*, blog_categories(*), profiles(id, full_name, avatar_url, job_title)")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (categorySlug) {
        const { data: category } = await supabase
          .from("blog_categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();
        
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BlogPost[];
    },
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(*), profiles(id, full_name, avatar_url, job_title)")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
  });
};

export const useAdminBlogCategories = () => {
  return useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("position");

      if (error) throw error;
      return data as BlogCategory[];
    },
  });
};

export const useAdminBlogPosts = () => {
  return useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(*), profiles(id, full_name, avatar_url, job_title)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, job_title")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateBlogCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: Partial<BlogCategory>) => {
      const { data, error } = await supabase
        .from("blog_categories")
        .insert([category as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateBlogCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from("blog_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      toast({ title: "Categoria atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar categoria", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteBlogCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      toast({ title: "Categoria removida com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover categoria", description: error.message, variant: "destructive" });
    },
  });
};

export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const postData: any = { ...post };
      if (user?.id) {
        postData.created_by = user.id;
        postData.updated_by = user.id;
        // Se não houver author_id definido, usa o usuário atual
        if (!postData.author_id) {
          postData.author_id = user.id;
        }
      }
      
      const { data, error } = await supabase
        .from("blog_posts")
        .insert([postData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Post criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar post", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("blog_posts")
        .update({ ...updates, updated_by: user?.id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Post atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar post", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Post removido com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover post", description: error.message, variant: "destructive" });
    },
  });
};
