import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Save, Settings } from "lucide-react";
import { useSiteSettings, useUpdateSiteSettings, useUploadSiteImage } from "@/hooks/useSiteSettings";

export default function AdminSiteSettings() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const uploadImage = useUploadSiteImage();

  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setOgTitle(settings.og_title || "");
      setOgDescription(settings.og_description || "");
      setOgImageUrl(settings.og_image_url);
      setFaviconUrl(settings.favicon_url);
    }
  }, [settings]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "og_image" | "favicon"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage.mutateAsync({ file, type });
      if (type === "og_image") {
        setOgImageUrl(url);
      } else {
        setFaviconUrl(url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      og_title: ogTitle || undefined,
      og_description: ogDescription || undefined,
      og_image_url: ogImageUrl || undefined,
      favicon_url: faviconUrl || undefined,
    });
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Configuração Geral</h1>
                <p className="text-muted-foreground">
                  Configure as meta tags e informações de compartilhamento do site
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Meta Tags (Open Graph)</CardTitle>
                <CardDescription>
                  Essas informações aparecem quando alguém compartilha o link do site em redes sociais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="og-title">Título (og:title)</Label>
                  <Input
                    id="og-title"
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    placeholder="Martech Efí Bank"
                  />
                  <p className="text-xs text-muted-foreground">
                    Título que aparece na preview de compartilhamento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="og-description">Descrição (og:description)</Label>
                  <Textarea
                    id="og-description"
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                    placeholder="Plataforma de marketing digital do Efí Bank"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Descrição que aparece abaixo do título na preview
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Imagem de Preview (og:image)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      {ogImageUrl ? (
                        <div className="relative">
                          <img
                            src={ogImageUrl}
                            alt="OG Image"
                            className="w-full h-32 object-cover rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setOgImageUrl(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center cursor-pointer py-4">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground mt-2">
                            Upload (1200x630px)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "og_image")}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recomendado: 1200x630 pixels
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      {faviconUrl ? (
                        <div className="relative flex justify-center">
                          <img
                            src={faviconUrl}
                            alt="Favicon"
                            className="w-16 h-16 object-contain"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setFaviconUrl(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center cursor-pointer py-4">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground mt-2">
                            Upload Favicon
                          </span>
                          <input
                            type="file"
                            accept="image/*,.ico"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "favicon")}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ícone do site (32x32 ou 64x64 pixels)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview de Compartilhamento</CardTitle>
                <CardDescription>
                  Visualize como o link aparecerá quando compartilhado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  {ogImageUrl && (
                    <img
                      src={ogImageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">
                      martech-efi.lovable.app
                    </p>
                    <h3 className="font-semibold text-foreground">
                      {ogTitle || "Título do site"}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ogDescription || "Descrição do site aparecerá aqui"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
