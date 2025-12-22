import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEfiReportConfig } from "@/hooks/useEfiReportConfig";
import { Loader2, Save, Plus, X, Upload, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminEfiReport() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config, loading, saving, updateConfig, uploadLogo, deleteLogo } = useEfiReportConfig();

  // Form state
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [designPrompt, setDesignPrompt] = useState("");
  const [dataFormattingPrompt, setDataFormattingPrompt] = useState("");
  const [recommendationsPrompt, setRecommendationsPrompt] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [resolution, setResolution] = useState("2K");
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (config) {
      setAnalysisPrompt(config.analysis_prompt);
      setDesignPrompt(config.design_prompt);
      setDataFormattingPrompt(config.data_formatting_prompt || '');
      setRecommendationsPrompt(config.recommendations_prompt || '');
      setLogoUrl(config.logo_url);
      setAspectRatio(config.aspect_ratio);
      setResolution(config.resolution);
      setColors(config.colors);
    }
  }, [config]);

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
    setAuthLoading(false);
  };

  const handleSave = async () => {
    await updateConfig({
      analysis_prompt: analysisPrompt,
      design_prompt: designPrompt,
      data_formatting_prompt: dataFormattingPrompt,
      recommendations_prompt: recommendationsPrompt,
      logo_url: logoUrl,
      aspect_ratio: aspectRatio,
      resolution: resolution,
      colors: colors,
    });
  };

  const addColor = () => {
    if (newColor && /^#[0-9A-Fa-f]{6}$/.test(newColor)) {
      if (!colors.includes(newColor)) {
        setColors([...colors, newColor]);
      }
      setNewColor("");
    } else {
      toast({
        title: "Cor inválida",
        description: "Use o formato hexadecimal (ex: #f37021)",
        variant: "destructive",
      });
    }
  };

  const removeColor = (colorToRemove: string) => {
    setColors(colors.filter(c => c !== colorToRemove));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    
    // Delete old logo if exists and is from our storage
    if (logoUrl && logoUrl.includes('plugin-images')) {
      await deleteLogo(logoUrl);
    }
    
    // Upload new logo
    const newUrl = await uploadLogo(file);
    
    if (newUrl) {
      setLogoUrl(newUrl);
      toast({ title: 'Logo carregado com sucesso!' });
    }
    
    setUploadingLogo(false);
    
    // Reset input
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (logoUrl && logoUrl.includes('plugin-images')) {
      await deleteLogo(logoUrl);
    }
    setLogoUrl('');
    toast({ title: 'Logo removido' });
  };

  if (authLoading || !isAdmin) {
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
              <h1 className="text-xl font-semibold">Configuração do Efí Report</h1>
            </div>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </header>

          <main className="p-6 max-w-4xl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Data Formatting Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="data_formatting_prompt">Prompt de Formatação de Dados (GPT-5-nano)</Label>
                  <p className="text-sm text-muted-foreground">
                    Este prompt formata os dados para o infográfico. <strong>NÃO deve incluir insights ou recomendações</strong> - apenas dados formatados.
                  </p>
                  <Textarea
                    id="data_formatting_prompt"
                    value={dataFormattingPrompt}
                    onChange={(e) => setDataFormattingPrompt(e.target.value)}
                    rows={5}
                    className="font-mono text-sm"
                    placeholder="Formate os dados abaixo de forma clara para um infográfico visual. NÃO inclua análises ou recomendações."
                  />
                </div>

                {/* Recommendations Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="recommendations_prompt">Prompt de Recomendações (GPT-5-nano)</Label>
                  <p className="text-sm text-muted-foreground">
                    Este prompt gera recomendações e insights estratégicos que aparecem <strong>abaixo do infográfico</strong> como texto.
                  </p>
                  <Textarea
                    id="recommendations_prompt"
                    value={recommendationsPrompt}
                    onChange={(e) => setRecommendationsPrompt(e.target.value)}
                    rows={5}
                    className="font-mono text-sm"
                    placeholder="Gere recomendações estratégicas e insights acionáveis baseados nos dados. Formate em markdown."
                  />
                </div>

                {/* Legacy Analysis Prompt (hidden or collapsed) */}
                <details className="border rounded-lg p-4 bg-muted/30">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Prompt de Análise Legado (não utilizado)
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Textarea
                      id="analysis_prompt"
                      value={analysisPrompt}
                      onChange={(e) => setAnalysisPrompt(e.target.value)}
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                </details>

                {/* Design Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="design_prompt">Prompt de Design (nano-banana-pro)</Label>
                  <p className="text-sm text-muted-foreground">
                    Este prompt é combinado com a análise para gerar o infográfico. A variável {'{analysis}'} será substituída pelo resultado da análise.
                  </p>
                  <Textarea
                    id="design_prompt"
                    value={designPrompt}
                    onChange={(e) => setDesignPrompt(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo do Relatório</Label>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de uma imagem PNG ou JPG para usar como logo no infográfico.
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    ref={logoInputRef}
                  />
                  
                  {logoUrl ? (
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="h-16 object-contain bg-background rounded p-2 border" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground truncate">{logoUrl}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDeleteLogo}
                          disabled={uploadingLogo}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Clique para selecionar uma imagem
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Aspect Ratio and Resolution */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proporção da Imagem</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                        <SelectItem value="3:4">3:4 (Retrato)</SelectItem>
                        <SelectItem value="4:3">4:3 (Paisagem)</SelectItem>
                        <SelectItem value="9:16">9:16 (Stories)</SelectItem>
                        <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resolução</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1K">1K</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <Label>Paleta de Cores</Label>
                  <p className="text-sm text-muted-foreground">
                    Cores disponíveis para o infográfico (formato hexadecimal).
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {colors.map((color) => (
                      <Badge
                        key={color}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <div
                          className="w-4 h-4 rounded-sm border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-xs">{color}</span>
                        <button
                          onClick={() => removeColor(color)}
                          className="ml-1 hover:bg-muted rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="#f37021"
                      className="w-32 font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={addColor}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
