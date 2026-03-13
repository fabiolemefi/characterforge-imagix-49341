import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(str: string | null): string {
  if (str === null || str === undefined) return "NULL";
  return `'${str.replace(/'/g, "''")}'`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all data
    const [categoriesRes, imagesRes, iconsRes] = await Promise.all([
      supabase.from("efi_image_categories").select("*").order("position"),
      supabase.from("efi_library_images").select("*").order("position"),
      supabase.from("efi_library_icons").select("*").order("group_prefix").order("name"),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (imagesRes.error) throw imagesRes.error;
    if (iconsRes.error) throw iconsRes.error;

    const categories = categoriesRes.data || [];
    const images = imagesRes.data || [];
    const icons = iconsRes.data || [];

    // Build SQL INSERT statements
    let sql = `-- =============================================\n`;
    sql += `-- Migração da Biblioteca de Imagens e Ícones\n`;
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += `-- Total: ${categories.length} categorias, ${images.length} imagens, ${icons.length} ícones\n`;
    sql += `-- =============================================\n\n`;

    // Schema creation
    sql += `-- ===== 1. CRIAÇÃO DAS TABELAS =====\n\n`;
    
    sql += `CREATE TABLE IF NOT EXISTS public.efi_image_categories (\n`;
    sql += `  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  name text NOT NULL,\n`;
    sql += `  slug text NOT NULL,\n`;
    sql += `  description text,\n`;
    sql += `  position integer NOT NULL DEFAULT 0,\n`;
    sql += `  is_active boolean NOT NULL DEFAULT true,\n`;
    sql += `  created_at timestamptz NOT NULL DEFAULT now(),\n`;
    sql += `  updated_at timestamptz NOT NULL DEFAULT now(),\n`;
    sql += `  created_by uuid\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS public.efi_library_images (\n`;
    sql += `  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  category_id uuid REFERENCES public.efi_image_categories(id),\n`;
    sql += `  name text NOT NULL,\n`;
    sql += `  url text NOT NULL,\n`;
    sql += `  thumbnail_url text,\n`;
    sql += `  alt_text text,\n`;
    sql += `  tags text[] DEFAULT '{}',\n`;
    sql += `  position integer NOT NULL DEFAULT 0,\n`;
    sql += `  is_active boolean NOT NULL DEFAULT true,\n`;
    sql += `  created_at timestamptz NOT NULL DEFAULT now(),\n`;
    sql += `  updated_at timestamptz NOT NULL DEFAULT now(),\n`;
    sql += `  created_by uuid\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS public.efi_library_icons (\n`;
    sql += `  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  name text NOT NULL,\n`;
    sql += `  filename text NOT NULL,\n`;
    sql += `  group_prefix text NOT NULL DEFAULT 'geral',\n`;
    sql += `  url text NOT NULL,\n`;
    sql += `  is_active boolean NOT NULL DEFAULT true,\n`;
    sql += `  created_at timestamptz NOT NULL DEFAULT now(),\n`;
    sql += `  created_by uuid\n`;
    sql += `);\n\n`;

    // RLS
    sql += `-- ===== 2. RLS POLICIES =====\n\n`;
    sql += `ALTER TABLE public.efi_image_categories ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.efi_library_images ENABLE ROW LEVEL SECURITY;\n`;
    sql += `ALTER TABLE public.efi_library_icons ENABLE ROW LEVEL SECURITY;\n\n`;

    sql += `-- Categories policies\n`;
    sql += `CREATE POLICY "Admins can manage image categories" ON public.efi_image_categories\n`;
    sql += `  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))\n`;
    sql += `  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));\n\n`;
    sql += `CREATE POLICY "Anyone can view active image categories" ON public.efi_image_categories\n`;
    sql += `  FOR SELECT USING (is_active = true);\n\n`;

    sql += `-- Images policies\n`;
    sql += `CREATE POLICY "Admins can manage library images" ON public.efi_library_images\n`;
    sql += `  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))\n`;
    sql += `  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));\n\n`;
    sql += `CREATE POLICY "Anyone can view active library images" ON public.efi_library_images\n`;
    sql += `  FOR SELECT USING (is_active = true);\n\n`;

    sql += `-- Icons policies\n`;
    sql += `CREATE POLICY "Admins can manage library icons" ON public.efi_library_icons\n`;
    sql += `  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))\n`;
    sql += `  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));\n\n`;
    sql += `CREATE POLICY "Anyone can view active library icons" ON public.efi_library_icons\n`;
    sql += `  FOR SELECT USING (is_active = true);\n\n`;

    // Storage bucket
    sql += `-- ===== 3. STORAGE BUCKET =====\n\n`;
    sql += `INSERT INTO storage.buckets (id, name, public) VALUES ('efi-code-assets', 'efi-code-assets', true)\n`;
    sql += `ON CONFLICT (id) DO NOTHING;\n\n`;
    sql += `CREATE POLICY "Public read efi-code-assets" ON storage.objects\n`;
    sql += `  FOR SELECT USING (bucket_id = 'efi-code-assets');\n\n`;
    sql += `CREATE POLICY "Auth users upload efi-code-assets" ON storage.objects\n`;
    sql += `  FOR INSERT WITH CHECK (bucket_id = 'efi-code-assets' AND auth.role() = 'authenticated');\n\n`;

    // Data inserts
    sql += `-- ===== 4. DADOS: CATEGORIAS =====\n\n`;
    for (const cat of categories) {
      sql += `INSERT INTO public.efi_image_categories (id, name, slug, description, position, is_active)\n`;
      sql += `VALUES (${escapeSQL(cat.id)}, ${escapeSQL(cat.name)}, ${escapeSQL(cat.slug)}, ${escapeSQL(cat.description)}, ${cat.position}, ${cat.is_active});\n`;
    }

    sql += `\n-- ===== 5. DADOS: IMAGENS =====\n\n`;
    for (const img of images) {
      sql += `INSERT INTO public.efi_library_images (id, category_id, name, url, thumbnail_url, alt_text, tags, position, is_active)\n`;
      const tagsStr = img.tags && img.tags.length > 0 ? `ARRAY[${img.tags.map((t: string) => escapeSQL(t)).join(',')}]` : `'{}'::text[]`;
      sql += `VALUES (${escapeSQL(img.id)}, ${escapeSQL(img.category_id)}, ${escapeSQL(img.name)}, ${escapeSQL(img.url)}, ${escapeSQL(img.thumbnail_url)}, ${escapeSQL(img.alt_text)}, ${tagsStr}, ${img.position}, ${img.is_active});\n`;
    }

    sql += `\n-- ===== 6. DADOS: ÍCONES (${icons.length} registros) =====\n\n`;
    for (const icon of icons) {
      sql += `INSERT INTO public.efi_library_icons (id, name, filename, group_prefix, url, is_active)\n`;
      sql += `VALUES (${escapeSQL(icon.id)}, ${escapeSQL(icon.name)}, ${escapeSQL(icon.filename)}, ${escapeSQL(icon.group_prefix)}, ${escapeSQL(icon.url)}, ${icon.is_active});\n`;
    }

    // Also generate JSON export
    const jsonExport = {
      exported_at: new Date().toISOString(),
      summary: {
        categories: categories.length,
        images: images.length,
        icons: icons.length,
      },
      categories,
      images,
      icons,
    };

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "sql";

    if (format === "json") {
      return new Response(JSON.stringify(jsonExport, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Content-Disposition": "attachment; filename=library-migration.json" },
      });
    }

    return new Response(sql, {
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": "attachment; filename=library-migration.sql" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
