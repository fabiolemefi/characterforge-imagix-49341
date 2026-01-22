import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CloudUpload, Download, ArrowLeft, Sparkles, ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useCampaign, useCampaignAssets, ImageCampaignAsset } from "@/hooks/useImageCampaigns";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { data: campaign, isLoading: loadingCampaign, error } = useCampaign(slug);
  const { data: assets = [] } = useCampaignAssets(campaign?.id);

  // Timeout detection for loading state
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (loadingCampaign) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loadingCampaign]);

  const handleRetry = () => {
    localStorage.removeItem('sb-dbxaamdirxjrbolsegwz-auth-token');
    window.location.reload();
  };

  const visibleAssets = assets.filter((a) => a.is_visible);

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

  // Trigger confetti when image is ready
  useEffect(() => {
    if (generatedImage) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F37021', '#FF9500', '#FFD700', '#FFFFFF'],
      });
    }
  }, [generatedImage]);

  // Normalize text: remove accents and convert to lowercase
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (campaign && normalizeText(accessCode) === normalizeText(campaign.access_code || "")) {
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

  // Read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Get cropped image from canvas
  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;

    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Output 1024x1024
    canvas.width = 1024;
    canvas.height = 1024;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      1024,
      1024
    );

    return canvas.toDataURL("image/png");
  };

  // Handle crop completion
  const handleCropComplete = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
    setUploadedImage(croppedImage);
    setGeneratedImage(null);
    setShowCropper(false);
    setImageToCrop(null);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Read image as data URL
    const imageUrl = await readFileAsDataURL(file);
    const img = new Image();

    img.onload = () => {
      // Check if image is square (1% tolerance)
      const isSquare = Math.abs(img.width - img.height) / Math.max(img.width, img.height) < 0.01;

      if (isSquare) {
        // Square image: use directly
        setUploadedImage(imageUrl);
        setGeneratedImage(null);
      } else {
        // Non-square image: open cropper
        setImageToCrop(imageUrl);
        setShowCropper(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      }
    };

    img.src = imageUrl;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const applySealOverlay = async (baseImageUrl: string, sealUrl: string): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // Fallback to creating a canvas
      const fallbackCanvas = document.createElement("canvas");
      const ctx = fallbackCanvas.getContext("2d")!;
      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";

      return new Promise((resolve) => {
        baseImg.onload = () => {
          fallbackCanvas.width = baseImg.width;
          fallbackCanvas.height = baseImg.height;
          ctx.drawImage(baseImg, 0, 0);

          const sealImg = new Image();
          sealImg.crossOrigin = "anonymous";
          sealImg.onload = () => {
            ctx.globalAlpha = campaign?.seal_opacity || 0.95;
            ctx.drawImage(sealImg, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
            ctx.globalAlpha = 1;
            resolve(fallbackCanvas.toDataURL("image/png"));
          };
          sealImg.src = sealUrl;
        };
        baseImg.src = baseImageUrl;
      });
    }

    const ctx = canvas.getContext("2d")!;
    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";

    return new Promise((resolve) => {
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
    setGeneratedImage(null);

    try {
      // If not customizing, just apply seal overlay
      if (!useCustomization || campaign.customization_mode === "never") {
        const result = await applySealOverlay(uploadedImage, selectedAsset.image_url);
        setGeneratedImage(result);
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
      
      pollingRef.current = setInterval(async () => {
        const { data: record } = await supabase
          .from("generated_images")
          .select("status, image_url")
          .eq("id", recordId)
          .single();

        if (record?.status === "completed" && record.image_url) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Apply seal overlay to the AI-generated image
          const finalImage = await applySealOverlay(record.image_url, selectedAsset.image_url);
          setGeneratedImage(finalImage);
          setIsGenerating(false);
          toast.success("Imagem gerada com sucesso!");
        } else if (record?.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast.error("Erro na geração da imagem");
          setIsGenerating(false);
        }
      }, 3000);
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

  const handleRepeat = () => {
    setGeneratedImage(null);
    setUploadedImage(null);
    setSelectedAsset(null);
  };

  // Loading state
  if (loadingCampaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {loadingTimeout && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              O carregamento está demorando mais que o esperado
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Campaign not found or inactive
  if (error || !campaign || !campaign.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Campanha não encontrada</h2>
          <p className="text-muted-foreground">
            Esta campanha não existe ou não está ativa no momento.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Access code required
  if (!isAuthenticated && campaign.access_code) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: campaign.background_image_url
            ? `url(${campaign.background_image_url})`
            : undefined,
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <form onSubmit={handleAccessCodeSubmit} className="relative z-10 w-full max-w-xs space-y-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl">
          {campaign.logo_url && (
            <img src={campaign.logo_url} alt="Logo" className="w-[80px] mx-auto" />
          )}
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold text-white">{campaign.title}</h1>
            {campaign.subtitle && (
              <p className="text-sm text-white/70">{campaign.subtitle}</p>
            )}
          </div>
          <Input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Digite o código de acesso"
            className="text-center bg-white/20 border-white/30 text-white placeholder:text-white/50"
          />
          <Button type="submit" className="w-full">Acessar</Button>
        </form>
      </div>
    );
  }

  // Main interface
  const ogTitle = campaign.og_title || campaign.title;
  const ogDescription = campaign.og_description || campaign.subtitle || "";
  const ogImage = campaign.og_image_url || campaign.logo_url || campaign.background_image_url || "";

  return (
    <>
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Helmet>
      <div
        className={`min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat transition-all duration-500 relative ${
          generatedImage ? 'backdrop-blur-md' : ''
        }`}
        style={{
          backgroundImage: campaign.background_image_url
            ? `url(${campaign.background_image_url})`
            : undefined,
        }}
      >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className={`relative z-10 w-full max-w-md space-y-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl transition-all duration-500 ${
        generatedImage ? 'ring-2 ring-white/30 shadow-2xl' : ''
      }`}>
        {/* Header */}
        <div className="text-center">
          {campaign.logo_url && (
            <img src={campaign.logo_url} alt="Logo" className="w-[80px] mx-auto mb-2" />
          )}
          <h1 className="text-xl font-bold text-white">{campaign.title}</h1>
          {campaign.subtitle && (
            <p className="text-sm text-white/70">{campaign.subtitle}</p>
          )}
        </div>

        {!generatedImage ? (
          <>
            {/* Upload */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative border-2 border-dashed border-white/30 rounded-lg p-6 text-center cursor-pointer hover:border-white/50 transition-colors bg-white/5"
              onClick={() => !isGenerating && document.getElementById('campaign-file-input')?.click()}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Upload" className="max-h-40 mx-auto rounded" />
              ) : (
                <div className="space-y-2">
                  <CloudUpload className="h-8 w-8 mx-auto text-white/60" />
                  <p className="text-sm text-white/60">Enviar imagem</p>
                </div>
              )}
              
              {/* Loader overlay */}
              {uploadedImage && isGenerating && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg gap-3">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                  <p className="text-sm text-white/80">Isso pode levar até 1 min, aguarde...</p>
                </div>
              )}
              
              <input
                id="campaign-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Selos */}
            {visibleAssets.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {visibleAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    disabled={isGenerating}
                    className={`p-2 border rounded-lg transition-all bg-white/10 ${
                      selectedAsset?.id === asset.id 
                        ? 'border-white ring-2 ring-white/30' 
                        : 'border-white/20 hover:border-white/40'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <img src={asset.thumbnail_url || asset.image_url} alt={asset.name} className="w-full aspect-square object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Customization Toggle */}
            {campaign.customization_mode === "user_choice" && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/20">
                <div className="space-y-0.5">
                  <Label className="text-sm text-white">
                    Customizar com IA
                  </Label>
                  <p className="text-xs text-white/60">
                    {useCustomization
                      ? "Sua foto será transformada"
                      : "Apenas aplicamos o selo"}
                  </p>
                </div>
                <Switch
                  checked={useCustomization}
                  onCheckedChange={setUseCustomization}
                />
              </div>
            )}

            {/* Gerar */}
            <Button 
              onClick={handleGenerate} 
              disabled={!uploadedImage || !selectedAsset || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  {useCustomization && campaign.customization_mode !== "never" ? (
                    <Sparkles className="mr-2 h-4 w-4" />
                  ) : (
                    <ImageIcon className="mr-2 h-4 w-4" />
                  )}
                  Gerar Imagem
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Resultado final */}
            <div className="border border-white/20 rounded-lg p-2 bg-white/5">
              <img src={generatedImage} alt="Resultado" className="w-full rounded" />
            </div>
            
            {/* Botões: Repetir | Baixar */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleRepeat}
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Repetir
              </Button>
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
        
        {/* Footer */}
        {campaign.footer_text && (
          <p className="text-xs text-white/50 text-center">{campaign.footer_text}</p>
        )}
      </div>

      {/* Cropper Modal */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar imagem</DialogTitle>
            <DialogDescription>
              Arraste e ajuste o zoom para selecionar a área da foto
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedAreaPixels) =>
                  setCroppedAreaPixels(croppedAreaPixels)
                }
              />
            )}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropper(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCropComplete}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
