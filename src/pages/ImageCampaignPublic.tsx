import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Download, ArrowLeft, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useCampaign, useCampaignAssets, ImageCampaign, ImageCampaignAsset } from "@/hooks/useImageCampaigns";
import { supabase } from "@/integrations/supabase/client";

export default function ImageCampaignPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [accessCode, setAccessCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImageCampaignAsset | null>(null);
  const [useCustomization, setUseCustomization] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaign, isLoading: loadingCampaign, error } = useCampaign(slug);
  const { data: assets = [] } = useCampaignAssets(campaign?.id);

  const visibleAssets = assets.filter((a) => a.is_visible);
  const hiddenAssets = assets.filter((a) => !a.is_visible);

  // Auto-authenticate if no access code required
  useEffect(() => {
    if (campaign && !campaign.access_code) {
      setIsAuthenticated(true);
    }
  }, [campaign]);

  // Set default customization based on mode
  useEffect(() => {
    if (campaign) {
      setUseCustomization(campaign.customization_mode !== "never");
    }
  }, [campaign]);

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (campaign && accessCode.toLowerCase() === campaign.access_code?.toLowerCase()) {
      setIsAuthenticated(true);
      toast.success("Acesso liberado!");
    } else {
      toast.error("Código de acesso inválido");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setGeneratedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const applySealOverlay = async (baseImageUrl: string, sealUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";

      baseImg.onload = () => {
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        ctx.drawImage(baseImg, 0, 0);

        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.onload = () => {
          ctx.globalAlpha = campaign?.seal_opacity || 0.95;
          ctx.drawImage(sealImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          resolve(canvas.toDataURL("image/png"));
        };
        sealImg.src = sealUrl;
      };
      baseImg.src = baseImageUrl;
    });
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedAsset || !campaign) {
      toast.error("Selecione uma imagem e um selo");
      return;
    }

    setIsGenerating(true);

    try {
      // If not customizing, just apply seal overlay
      if (!useCustomization || campaign.customization_mode === "never") {
        const result = await applySealOverlay(uploadedImage, selectedAsset.image_url);
        setGeneratedImage(result);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        toast.success("Imagem gerada com sucesso!");
        setIsGenerating(false);
        return;
      }

      // With customization - call edge function
      const base64 = uploadedImage.split(",")[1];
      
      const { data, error } = await supabase.functions.invoke("generate-selo-image", {
        body: {
          imageBase64: base64,
          campaignId: campaign.id,
          sealAssetId: selectedAsset.id,
        },
      });

      if (error) throw error;

      // Poll for result
      const recordId = data.recordId;
      let attempts = 0;
      const maxAttempts = 120;

      const checkResult = async () => {
        const { data: record } = await supabase
          .from("generated_images")
          .select("status, image_url")
          .eq("id", recordId)
          .single();

        if (record?.status === "completed" && record.image_url) {
          // Apply seal overlay to the AI-generated image
          const finalImage = await applySealOverlay(record.image_url, selectedAsset.image_url);
          setGeneratedImage(finalImage);
          setIsGenerating(false);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          toast.success("Imagem gerada com sucesso!");
        } else if (record?.status === "failed") {
          throw new Error("Falha ao gerar imagem");
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkResult, 2000);
        } else {
          throw new Error("Tempo limite excedido");
        }
      };

      await checkResult();
    } catch (err) {
      console.error("Generation error:", err);
      toast.error("Erro ao gerar imagem");
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.download = `${campaign?.slug || "imagem"}-gerada.png`;
    link.href = generatedImage;
    link.click();
  };

  // Loading state
  if (loadingCampaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Campaign not found or inactive
  if (error || !campaign || !campaign.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Campanha não encontrada</CardTitle>
            <CardDescription>
              Esta campanha não existe ou não está ativa no momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao início
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access code required
  if (!isAuthenticated && campaign.access_code) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: campaign.background_image_url
            ? `url(${campaign.background_image_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {campaign.logo_url && (
              <img
                src={campaign.logo_url}
                alt="Logo"
                className="h-16 mx-auto mb-4 object-contain"
              />
            )}
            <CardTitle>{campaign.title}</CardTitle>
            <CardDescription>{campaign.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Código de Acesso</Label>
                <Input
                  type="text"
                  placeholder="Digite o código"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <Button type="submit" className="w-full">
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main interface
  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{
        backgroundImage: campaign.background_image_url
          ? `url(${campaign.background_image_url})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {campaign.logo_url && (
            <img
              src={campaign.logo_url}
              alt="Logo"
              className="h-20 mx-auto object-contain"
            />
          )}
          <h1 className="text-3xl font-bold text-foreground">{campaign.title}</h1>
          {campaign.subtitle && (
            <p className="text-lg text-muted-foreground">{campaign.subtitle}</p>
          )}
        </div>

        {/* Upload Area */}
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedImage ? (
                <div className="space-y-4">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                  <p className="text-sm text-muted-foreground">
                    Clique para trocar a imagem
                  </p>
                </div>
              ) : (
                <div className="space-y-2 cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-lg font-medium">Clique ou arraste sua foto</p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG ou WEBP
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seal Selection */}
        {visibleAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escolha seu selo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visibleAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      selectedAsset?.id === asset.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/25"
                    }`}
                  >
                    <img
                      src={asset.image_url}
                      alt={asset.name}
                      className="w-full aspect-square object-cover"
                    />
                    {selectedAsset?.id === asset.id && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customization Toggle */}
        {campaign.customization_mode === "user_choice" && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Customizar com IA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {useCustomization
                      ? "Sua foto será transformada em estilo artístico"
                      : "Apenas aplicamos o selo na sua foto"}
                  </p>
                </div>
                <Switch
                  checked={useCustomization}
                  onCheckedChange={setUseCustomization}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        <Button
          className="w-full h-14 text-lg"
          onClick={handleGenerate}
          disabled={!uploadedImage || !selectedAsset || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Gerando sua imagem...
            </>
          ) : (
            <>
              {useCustomization && campaign.customization_mode !== "never" ? (
                <Sparkles className="mr-2 h-5 w-5" />
              ) : (
                <ImageIcon className="mr-2 h-5 w-5" />
              )}
              Gerar Imagem
            </>
          )}
        </Button>

        {/* Result */}
        {generatedImage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-center">
                Sua imagem está pronta! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src={generatedImage}
                alt="Resultado"
                className="w-full rounded-lg"
              />
              <Button className="w-full" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Imagem
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        {campaign.footer_text && (
          <p className="text-center text-sm text-muted-foreground">
            {campaign.footer_text}
          </p>
        )}
      </div>
    </div>
  );
}
