import React, { useState, useMemo, useCallback } from 'react';
import { useEditor, Element } from '@craftjs/core';
import { Container, Text, Heading, Button, Image, Divider, Spacer, HtmlBlock } from '../user-components';
import { useEfiCodeBlocks, EfiCodeBlock } from '@/hooks/useEfiCodeBlocks';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button as UIButton } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageSettings, defaultPageSettings } from '@/hooks/useEfiCodeSites';
import { 
  SquareDashed, 
  Type, 
  Heading as HeadingIcon, 
  MousePointerClick, 
  ImageIcon,
  Minus,
  MoveVertical,
  Video,
  Columns,
  FormInput,
  LayoutGrid,
  Link,
  List,
  Quote,
  Table,
  Code,
  LucideIcon,
  Settings,
  Layout,
  FileText,
  BarChart3,
  Upload,
  Loader2,
  Trash2,
} from 'lucide-react';

interface ToolboxItemProps {
  icon: React.ReactNode;
  label: string;
}

const ToolboxItem = ({ icon, label }: ToolboxItemProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors">
      <div className="text-muted-foreground mb-1">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

const ICON_MAP: Record<string, LucideIcon> = {
  SquareDashed,
  Type,
  Heading: HeadingIcon,
  MousePointerClick,
  ImageIcon,
  Minus,
  MoveVertical,
  Video,
  Columns,
  FormInput,
  LayoutGrid,
  Link,
  List,
  Quote,
  Table,
  Code,
};

interface ToolboxProps {
  pageSettings?: PageSettings;
  onPageSettingsChange?: (settings: PageSettings) => void;
}

export const Toolbox = ({ pageSettings, onPageSettingsChange }: ToolboxProps) => {
  const { connectors } = useEditor();
  const { blocks, isLoading } = useEfiCodeBlocks(true);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

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

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <SquareDashed className="h-5 w-5" />;
  };

  // Memoizar a função getComponent para estabilidade
  const getComponent = useCallback((block: EfiCodeBlock): React.ReactElement => {
    // Se tem html_content, usar HtmlBlock diretamente (sem Element wrapper para serialização correta)
    if (block.html_content) {
      const dynamicProps = (block.default_props as Record<string, any>) || {};
      return (
        <HtmlBlock 
          htmlTemplate={block.html_content} 
          {...dynamicProps} 
        />
      );
    }
    
    // Caso contrário, usar componente padrão (compatibilidade)
    const defaultProps = block.default_props || {};
    switch (block.component_type) {
      case 'Container':
        return <Element is={Container} canvas {...defaultProps} />;
      case 'Heading':
        return <Heading {...defaultProps} />;
      case 'Text':
        return <Text {...defaultProps} />;
      case 'Button':
        return <Button {...defaultProps} />;
      case 'Image':
        return <Image {...defaultProps} />;
      case 'Divider':
        return <Divider {...defaultProps} />;
      case 'Spacer':
        return <Spacer {...defaultProps} />;
      case 'HtmlBlock':
        // Usar HtmlBlock diretamente para serialização correta
        return <HtmlBlock htmlTemplate="" {...defaultProps} />;
      default:
        return <Element is={Container} canvas {...defaultProps} />;
    }
  }, []);

  // Memoizar todos os componentes para evitar recriação a cada render
  // Isso garante que connectors.create receba sempre o mesmo componente
  const memoizedComponents = useMemo(() => {
    const components: Record<string, React.ReactElement> = {};
    blocks.forEach(block => {
      components[block.id] = getComponent(block);
    });
    return components;
  }, [blocks, getComponent]);

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Componentes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Accordion type="multiple" defaultValue={["components"]} className="w-full">
        {/* Componentes */}
        <AccordionItem value="components" className="border-none">
          <AccordionTrigger className="text-sm font-semibold text-muted-foreground uppercase tracking-wide py-2 hover:no-underline">
            Componentes
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  ref={(ref) => {
                    if (ref && memoizedComponents[block.id]) {
                      connectors.create(ref, memoizedComponents[block.id]);
                    }
                  }}
                >
                  <ToolboxItem
                    icon={getIcon(block.icon_name)}
                    label={block.name}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Configurações da Página */}
        <AccordionItem value="page-settings" className="border-none">
          <AccordionTrigger className="text-sm font-semibold text-muted-foreground uppercase tracking-wide py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Accordion type="multiple" defaultValue={[]} className="w-full">
              {/* Layout */}
              <AccordionItem value="layout" className="border-b">
                <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Layout className="h-3 w-3" />
                    Layout
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Largura máxima (px)</Label>
                    <Input
                      type="number"
                      value={settings.containerMaxWidth}
                      onChange={(e) => handleSettingChange('containerMaxWidth', e.target.value)}
                      placeholder="1200"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Padding da Página */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Padding da Página (px)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Superior</Label>
                        <Input
                          type="number"
                          value={settings.paddingTop || '0'}
                          onChange={(e) => handleSettingChange('paddingTop', e.target.value)}
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Inferior</Label>
                        <Input
                          type="number"
                          value={settings.paddingBottom || '0'}
                          onChange={(e) => handleSettingChange('paddingBottom', e.target.value)}
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Esquerda</Label>
                        <Input
                          type="number"
                          value={settings.paddingLeft || '0'}
                          onChange={(e) => handleSettingChange('paddingLeft', e.target.value)}
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Direita</Label>
                        <Input
                          type="number"
                          value={settings.paddingRight || '0'}
                          onChange={(e) => handleSettingChange('paddingRight', e.target.value)}
                          placeholder="0"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cor de fundo com Paleta Efí */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cor de fundo</Label>
                    
                    {/* Checkbox transparente */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="transparent-bg"
                        checked={settings.backgroundColor === 'transparent'}
                        onChange={(e) => handleSettingChange('backgroundColor', e.target.checked ? 'transparent' : '#ffffff')}
                        className="h-3 w-3 rounded border-muted-foreground"
                      />
                      <Label htmlFor="transparent-bg" className="text-[10px] text-muted-foreground cursor-pointer">
                        Sem cor de fundo (transparente)
                      </Label>
                    </div>

                    {settings.backgroundColor !== 'transparent' && (
                      <>
                        <div className="flex gap-1">
                          <Input
                            type="color"
                            value={settings.backgroundColor || '#ffffff'}
                            onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                            className="w-10 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            value={settings.backgroundColor || '#ffffff'}
                            onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1 h-8 text-xs"
                          />
                        </div>

                        {/* Paleta de cores Efí */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Paleta de cores Efí</Label>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { hex: '#f37021', name: 'Laranja Efí' },
                              { hex: '#00809d', name: 'Verde-água Efí' },
                              { hex: '#f6f8fc', name: 'Cinza Claro' },
                              { hex: '#e8f0f8', name: 'Azul Gelo' },
                              { hex: '#a4acbc', name: 'Cinza Médio' },
                              { hex: '#1d1d1d', name: 'Preto' },
                            ].map((color) => (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => handleSettingChange('backgroundColor', color.hex)}
                                className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                                  settings.backgroundColor === color.hex 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-muted'
                                }`}
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Imagem de fundo */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Imagem de fundo
                    </Label>
                    
                    {settings.backgroundImage && (
                      <div className="relative rounded-md overflow-hidden border">
                        <img 
                          src={settings.backgroundImage} 
                          alt="Background preview" 
                          className="w-full h-16 object-cover"
                        />
                        <UIButton
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5"
                          onClick={handleRemoveBackground}
                        >
                          <Trash2 className="h-3 w-3" />
                        </UIButton>
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-1 px-2 py-1.5 border border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                      {isUploadingBackground ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      <span className="text-xs">
                        {isUploadingBackground ? 'Enviando...' : 'Upload'}
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
                      placeholder="Ou cole a URL"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Configurações de background */}
                  {settings.backgroundImage && (
                    <div className="space-y-2 pl-2 border-l-2 border-muted">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tamanho</Label>
                        <Select
                          value={settings.backgroundSize}
                          onValueChange={(value) => handleSettingChange('backgroundSize', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover">Cobrir tudo</SelectItem>
                            <SelectItem value="contain">Conter</SelectItem>
                            <SelectItem value="auto">Original</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Posição</Label>
                        <Select
                          value={settings.backgroundPosition}
                          onValueChange={(value) => handleSettingChange('backgroundPosition', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="top">Topo</SelectItem>
                            <SelectItem value="bottom">Inferior</SelectItem>
                            <SelectItem value="left">Esquerda</SelectItem>
                            <SelectItem value="right">Direita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Comportamento</Label>
                        <Select
                          value={settings.backgroundAttachment}
                          onValueChange={(value) => handleSettingChange('backgroundAttachment', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scroll">Rolar junto</SelectItem>
                            <SelectItem value="fixed">Fixo (parallax)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Repetição</Label>
                        <Select
                          value={settings.backgroundRepeat}
                          onValueChange={(value) => handleSettingChange('backgroundRepeat', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-repeat">Não repetir</SelectItem>
                            <SelectItem value="repeat">Repetir</SelectItem>
                            <SelectItem value="repeat-x">Horizontal</SelectItem>
                            <SelectItem value="repeat-y">Vertical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Classes CSS adicionais */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Classes CSS adicionais no body</Label>
                    <Input
                      value={settings.containerClasses || ''}
                      onChange={(e) => handleSettingChange('containerClasses', e.target.value)}
                      placeholder="ex: container-fluid my-class"
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Classes separadas por espaço</p>
                  </div>

                  {/* CSS inline */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CSS inline</Label>
                    <Textarea
                      value={settings.inlineStyles || ''}
                      onChange={(e) => handleSettingChange('inlineStyles', e.target.value)}
                      placeholder={`.size-40 {\n    width: inherit;\n    height: inherit;\n}\n.h1 { color: red; }`}
                      className="text-xs font-mono min-h-[120px]"
                    />
                    <p className="text-[10px] text-muted-foreground">Estilos CSS que serão injetados na página</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SEO */}
              <AccordionItem value="seo" className="border-b">
                <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    SEO & Metadados
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Título</Label>
                    <Input
                      value={settings.title}
                      onChange={(e) => handleSettingChange('title', e.target.value)}
                      placeholder="Meu Site"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <Textarea
                      value={settings.description}
                      onChange={(e) => handleSettingChange('description', e.target.value)}
                      placeholder="Descrição para SEO..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Palavras-chave</Label>
                    <Input
                      value={settings.keywords}
                      onChange={(e) => handleSettingChange('keywords', e.target.value)}
                      placeholder="marketing, digital"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Favicon</Label>
                    <div className="flex items-center gap-1">
                      {settings.favicon && (
                        <img 
                          src={settings.favicon} 
                          alt="Favicon" 
                          className="w-6 h-6 object-contain border rounded"
                        />
                      )}
                      <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                        {isUploadingFavicon ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        <span className="text-xs">
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
                      placeholder="Ou cole a URL"
                      className="h-8 text-xs"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Analytics */}
              <AccordionItem value="analytics" className="border-none">
                <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3 w-3" />
                    Analytics
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Google Analytics ID</Label>
                    <Input
                      value={settings.googleAnalyticsId}
                      onChange={(e) => handleSettingChange('googleAnalyticsId', e.target.value)}
                      placeholder="G-XXXXXXXXX"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Facebook Pixel ID</Label>
                    <Input
                      value={settings.facebookPixelId}
                      onChange={(e) => handleSettingChange('facebookPixelId', e.target.value)}
                      placeholder="123456789"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Código customizado (head)</Label>
                    <Textarea
                      value={settings.customHeadCode}
                      onChange={(e) => handleSettingChange('customHeadCode', e.target.value)}
                      placeholder="<script>...</script>"
                      rows={3}
                      className="font-mono text-xs resize-none"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
