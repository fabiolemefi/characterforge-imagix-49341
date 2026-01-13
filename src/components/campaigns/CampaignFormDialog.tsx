import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X } from "lucide-react";
import {
  ImageCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useUploadCampaignImage,
} from "@/hooks/useImageCampaigns";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  subtitle: z.string().optional(),
  prompt: z.string().optional(),
  access_code: z.string().optional(),
  is_active: z.boolean().default(true),
  customization_mode: z.enum(["always", "never", "user_choice"]).default("always"),
  seal_opacity: z.number().min(0).max(1).default(0.95),
  footer_text: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: ImageCampaign | null;
}

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignFormDialogProps) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);

  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const uploadImage = useUploadCampaignImage();

  const isEditing = !!campaign;
  const isLoading = createCampaign.isPending || updateCampaign.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      subtitle: "",
      prompt: "",
      access_code: "",
      is_active: true,
      customization_mode: "always",
      seal_opacity: 0.95,
      footer_text: "",
    },
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        title: campaign.title,
        slug: campaign.slug,
        subtitle: campaign.subtitle || "",
        prompt: campaign.prompt || "",
        access_code: campaign.access_code || "",
        is_active: campaign.is_active,
        customization_mode: campaign.customization_mode,
        seal_opacity: campaign.seal_opacity || 0.95,
        footer_text: campaign.footer_text || "",
      });
      setBackgroundImage(campaign.background_image_url);
      setLogoImage(campaign.logo_url);
    } else {
      form.reset({
        title: "",
        slug: "",
        subtitle: "",
        prompt: "",
        access_code: "",
        is_active: true,
        customization_mode: "always",
        seal_opacity: 0.95,
        footer_text: "",
      });
      setBackgroundImage(null);
      setLogoImage(null);
    }
  }, [campaign, form]);

  // Auto-generate slug from title
  const watchTitle = form.watch("title");
  useEffect(() => {
    if (!isEditing && watchTitle) {
      const slug = watchTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug);
    }
  }, [watchTitle, isEditing, form]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "background" | "logo"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage.mutateAsync({ file, folder: type });
      if (type === "background") {
        setBackgroundImage(url);
      } else {
        setLogoImage(url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && campaign) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          ...data,
          background_image_url: backgroundImage || undefined,
          logo_url: logoImage || undefined,
        });
      } else {
        await createCampaign.mutateAsync({
          title: data.title,
          slug: data.slug,
          subtitle: data.subtitle,
          prompt: data.prompt,
          access_code: data.access_code,
          is_active: data.is_active,
          customization_mode: data.customization_mode,
          seal_opacity: data.seal_opacity,
          footer_text: data.footer_text,
          background_image_url: backgroundImage || undefined,
          logo_url: logoImage || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Campanha" : "Nova Campanha"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da campanha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="url-amigavel" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL: /gerar/{field.value || "slug"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtítulo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Faça parte desse movimento!"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt para IA</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Desenhe a pessoa da imagem em estilo pixar..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Prompt enviado ao Replicate para customização (usado apenas quando customização está ativa)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customization_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de Customização</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="always">
                          Sempre customizar (IA)
                        </SelectItem>
                        <SelectItem value="never">
                          Nunca customizar (só selo)
                        </SelectItem>
                        <SelectItem value="user_choice">
                          Usuário escolhe
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Define se a imagem passa pela IA ou apenas aplica o selo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Acesso</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Deixe vazio para acesso livre"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Se preenchido, usuário precisa digitar para acessar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="seal_opacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Opacidade do Selo: {Math.round((field.value || 0.95) * 100)}%
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[Math.round((field.value || 0.95) * 100)]}
                      onValueChange={(value) =>
                        field.onChange(value[0] / 100)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Background Image Upload */}
              <div className="space-y-2">
                <FormLabel>Imagem de Fundo</FormLabel>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {backgroundImage ? (
                    <div className="relative">
                      <img
                        src={backgroundImage}
                        alt="Background"
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setBackgroundImage(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-1">
                        Upload Background
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "background")}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <FormLabel>Logo</FormLabel>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {logoImage ? (
                    <div className="relative">
                      <img
                        src={logoImage}
                        alt="Logo"
                        className="w-full h-24 object-contain rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setLogoImage(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mt-1">
                        Upload Logo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "logo")}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="footer_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto do Rodapé</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Boca de Sacola Productions and Tech"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Campanha Ativa</FormLabel>
                    <FormDescription>
                      Campanhas inativas não aparecem para os usuários
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
