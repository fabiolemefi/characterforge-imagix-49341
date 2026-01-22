import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Layout, FileText, BarChart3, Upload, Loader2, Trash2, ImageIcon } from 'lucide-react';
import { PageSettings, defaultPageSettings } from '@/hooks/useEfiCodeSites';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface SettingsPanelProps {
  pageSettings?: PageSettings;
  onPageSettingsChange?: (settings: PageSettings) => void;
}

export const SettingsPanel = ({ pageSettings, onPageSettingsChange }: SettingsPanelProps) => {
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  
  const { selected, actions } = useEditor((state) => {
    const currentNodeId = state.events.selected.size === 1 
      ? Array.from(state.events.selected)[0] 
      : null;
    
    let selected;
    if (currentNodeId) {
      const node = state.nodes[currentNodeId];
      selected = {
        id: currentNodeId,
        name: node.data.displayName || node.data.name,
        settings: node.related?.settings,
        isDeletable: node.data.custom?.isDeletable !== false && currentNodeId !== 'ROOT',
      };
    }
    
    return { selected };
  });

  const settings = pageSettings || defaultPageSettings;

  const handleSettingChange = (key: keyof PageSettings, value: string) => {
    if (onPageSettingsChange) {
      onPageSettingsChange({
        ...settings,
        [key]: value,
      });
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    setIsUploadingFavicon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;
      const filePath = `favicons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('efi-code-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('efi-code-assets')
        .getPublicUrl(filePath);

      handleSettingChange('favicon', publicUrl);
      toast.success('Favicon enviado!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar: ' + error.message);
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    setIsUploadingBackground(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('efi-code-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('efi-code-assets')
        .getPublicUrl(filePath);

      handleSettingChange('backgroundImage', publicUrl);
      toast.success('Imagem de fundo enviada!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar: ' + error.message);
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const handleRemoveBackground = () => {
    handleSettingChange('backgroundImage', '');
    toast.success('Imagem de fundo removida');
  };

  // Se um bloco está selecionado, mostrar suas configurações
  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Propriedades
          </h3>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selected.name}</span>
                {selected.isDeletable && (
                  <button
                    onClick={() => actions.delete(selected.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                )}
              </div>
              
              {selected.settings && React.createElement(selected.settings)}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Se nenhum bloco está selecionado, mostrar configurações da página
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Configurações da Página
          </h3>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Layout */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Layout className="h-4 w-4" />
              Layout
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="containerMaxWidth" className="text-xs text-muted-foreground">
                Largura máxima do container (px)
              </Label>
              <Input
                id="containerMaxWidth"
                type="number"
                value={settings.containerMaxWidth}
                onChange={(e) => handleSettingChange('containerMaxWidth', e.target.value)}
                placeholder="1200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundColor" className="text-xs text-muted-foreground">
                Cor de fundo
              </Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Imagem de fundo */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Imagem de fundo
              </Label>
              
              {settings.backgroundImage && (
                <div className="relative rounded-md overflow-hidden border">
                  <img 
                    src={settings.backgroundImage} 
                    alt="Background preview" 
                    className="w-full h-24 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={handleRemoveBackground}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                {isUploadingBackground ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {isUploadingBackground ? 'Enviando...' : 'Upload de imagem'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                  disabled={isUploadingBackground}
                />
              </label>

              <Input
                value={settings.backgroundImage}
                onChange={(e) => handleSettingChange('backgroundImage', e.target.value)}
                placeholder="Ou cole a URL da imagem"
              />
            </div>

            {/* Configurações de background (só aparecem se tiver imagem) */}
            {settings.backgroundImage && (
              <div className="space-y-3 pl-2 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tamanho</Label>
                  <Select
                    value={settings.backgroundSize}
                    onValueChange={(value) => handleSettingChange('backgroundSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cobrir tudo</SelectItem>
                      <SelectItem value="contain">Conter</SelectItem>
                      <SelectItem value="auto">Tamanho original</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Posição</Label>
                  <Select
                    value={settings.backgroundPosition}
                    onValueChange={(value) => handleSettingChange('backgroundPosition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="top">Topo</SelectItem>
                      <SelectItem value="bottom">Inferior</SelectItem>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                      <SelectItem value="top left">Topo esquerda</SelectItem>
                      <SelectItem value="top right">Topo direita</SelectItem>
                      <SelectItem value="bottom left">Inferior esquerda</SelectItem>
                      <SelectItem value="bottom right">Inferior direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Comportamento</Label>
                  <Select
                    value={settings.backgroundAttachment}
                    onValueChange={(value) => handleSettingChange('backgroundAttachment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scroll">Rolar junto</SelectItem>
                      <SelectItem value="fixed">Fixo (parallax)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Repetição</Label>
                  <Select
                    value={settings.backgroundRepeat}
                    onValueChange={(value) => handleSettingChange('backgroundRepeat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-repeat">Não repetir</SelectItem>
                      <SelectItem value="repeat">Repetir</SelectItem>
                      <SelectItem value="repeat-x">Repetir horizontalmente</SelectItem>
                      <SelectItem value="repeat-y">Repetir verticalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SEO & Metadados */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              SEO & Metadados
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs text-muted-foreground">
                Título da página
              </Label>
              <Input
                id="title"
                value={settings.title}
                onChange={(e) => handleSettingChange('title', e.target.value)}
                placeholder="Meu Site Incrível"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs text-muted-foreground">
                Meta description
              </Label>
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) => handleSettingChange('description', e.target.value)}
                placeholder="Descrição para SEO..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords" className="text-xs text-muted-foreground">
                Palavras-chave (separadas por vírgula)
              </Label>
              <Input
                id="keywords"
                value={settings.keywords}
                onChange={(e) => handleSettingChange('keywords', e.target.value)}
                placeholder="marketing, digital, efi"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Favicon
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {settings.favicon && (
                    <img 
                      src={settings.favicon} 
                      alt="Favicon" 
                      className="w-8 h-8 object-contain border rounded"
                    />
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                    {isUploadingFavicon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      {isUploadingFavicon ? 'Enviando...' : 'Upload'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                      disabled={isUploadingFavicon}
                    />
                  </label>
                </div>
                <Input
                  value={settings.favicon}
                  onChange={(e) => handleSettingChange('favicon', e.target.value)}
                  placeholder="Ou cole a URL do favicon"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Rastreio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Rastreio & Analytics
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleAnalyticsId" className="text-xs text-muted-foreground">
                Google Analytics ID
              </Label>
              <Input
                id="googleAnalyticsId"
                value={settings.googleAnalyticsId}
                onChange={(e) => handleSettingChange('googleAnalyticsId', e.target.value)}
                placeholder="G-XXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebookPixelId" className="text-xs text-muted-foreground">
                Facebook Pixel ID
              </Label>
              <Input
                id="facebookPixelId"
                value={settings.facebookPixelId}
                onChange={(e) => handleSettingChange('facebookPixelId', e.target.value)}
                placeholder="123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customHeadCode" className="text-xs text-muted-foreground">
                Código customizado (head)
              </Label>
              <Textarea
                id="customHeadCode"
                value={settings.customHeadCode}
                onChange={(e) => handleSettingChange('customHeadCode', e.target.value)}
                placeholder="<script>...</script>"
                rows={4}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
