import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { ArrowLeft, Save, Undo2, Redo2, Eye, Download, Monitor, Tablet, Smartphone, Code, Layers, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useEfiCodeSite, useEfiCodeSites, PageSettings, defaultPageSettings } from '@/hooks/useEfiCodeSites';
import { useEfiCodeConfig } from '@/hooks/useEfiCodeConfig';
import { Toolbox } from '@/components/eficode/editor/Toolbox';
import { SettingsPanel } from '@/components/eficode/editor/SettingsPanel';
import { generateFullHtml } from '@/lib/efiCodeHtmlGenerator';
import { 
  Container, 
  Text, 
  Heading, 
  Button as CraftButton, 
  Image, 
  Divider, 
  Spacer 
} from '@/components/eficode/user-components';

const resolvers = {
  Container,
  Text,
  Heading,
  Button: CraftButton,
  Image,
  Divider,
  Spacer,
};

type ViewMode = 'visual' | 'code';
type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const viewportWidths: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export default function EfiCodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: site, isLoading } = useEfiCodeSite(id);
  const { updateSite } = useEfiCodeSites();
  const { globalCss } = useEfiCodeConfig();
  const [siteName, setSiteName] = useState('');
  const [editorState, setEditorState] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>(defaultPageSettings);
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [codeContent, setCodeContent] = useState<string>('');

  useEffect(() => {
    if (site) {
      setSiteName(site.name);
      if (site.content && Object.keys(site.content).length > 0) {
        setEditorState(JSON.stringify(site.content));
      }
      if (site.page_settings) {
        setPageSettings(site.page_settings);
      }
    }
  }, [site]);

  const handleSave = useCallback(async (query: any) => {
    if (!id) return;
    
    const serialized = query.serialize();
    
    try {
      await updateSite.mutateAsync({
        id,
        name: siteName,
        content: JSON.parse(serialized),
        page_settings: pageSettings,
      });
      toast.success('Site salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  }, [id, siteName, pageSettings, updateSite]);

  const handleExport = useCallback((query: any) => {
    const serialized = query.serialize();
    const nodes = JSON.parse(serialized);
    
    const html = generateFullHtml(nodes, siteName, pageSettings, globalCss);
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('HTML exportado!');
  }, [siteName, pageSettings, globalCss]);

  const handleGenerateCode = useCallback((query: any) => {
    const serialized = query.serialize();
    const nodes = JSON.parse(serialized);
    const html = generateFullHtml(nodes, siteName, pageSettings, globalCss);
    setCodeContent(html);
  }, [siteName, pageSettings, globalCss]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!site && id) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Site não encontrado</h2>
          <Button variant="outline" onClick={() => navigate('/efi-code')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Editor resolver={resolvers}>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/efi-code')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-64 font-medium"
              placeholder="Nome do site"
            />
            
            {/* Responsiveness Toggles */}
            <ToggleGroup 
              type="single" 
              value={viewportSize} 
              onValueChange={(value) => value && setViewportSize(value as ViewportSize)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="desktop" aria-label="Desktop" className="px-3">
                <Monitor className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="tablet" aria-label="Tablet" className="px-3">
                <Tablet className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="mobile" aria-label="Mobile" className="px-3">
                <Smartphone className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <div className="flex items-center gap-2">
            <EditorActions 
              siteId={id}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSave={handleSave} 
              onExport={handleExport}
              onGenerateCode={handleGenerateCode}
            />
          </div>
        </header>

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Toolbox + Settings */}
          <aside className="w-64 border-r bg-background overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Toolbox 
                pageSettings={pageSettings}
                onPageSettingsChange={setPageSettings}
              />
            </ScrollArea>
          </aside>

          {/* Center - Viewport */}
          <main 
            className="flex-1 overflow-auto p-8"
            style={{ backgroundColor: pageSettings.backgroundColor }}
          >
            {viewMode === 'visual' ? (
              <div
                className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
                style={{ 
                  minHeight: '600px',
                  maxWidth: viewportSize === 'desktop' 
                    ? `${pageSettings.containerMaxWidth}px` 
                    : viewportWidths[viewportSize],
                  width: viewportWidths[viewportSize],
                }}
              >
                <EditorFrame editorState={editorState} />
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="bg-muted/50 px-4 py-2 border-b rounded-t-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">HTML Gerado (somente leitura)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(codeContent);
                      toast.success('Código copiado!');
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <textarea
                  value={codeContent}
                  readOnly
                  className="flex-1 w-full font-mono text-sm p-4 bg-secondary text-secondary-foreground rounded-b-lg resize-none focus:outline-none"
                  spellCheck={false}
                />
              </div>
            )}
          </main>

          {/* Right Sidebar - Component Settings */}
          <aside className="w-72 border-l bg-background overflow-hidden">
            <SettingsPanel />
          </aside>
        </div>
      </div>
    </Editor>
  );
}

// Componente para o Frame que carrega o estado salvo
function EditorFrame({ editorState }: { editorState: string | null }) {
  const { actions } = useEditor();

  useEffect(() => {
    if (editorState) {
      try {
        actions.deserialize(editorState);
      } catch (error) {
        console.error('Erro ao restaurar estado:', error);
      }
    }
  }, [editorState, actions]);

  return (
    <Frame>
      <Element
        is={Container}
        canvas
        background="#ffffff"
        padding={24}
        minHeight={600}
      >
        <Heading text="Bem-vindo ao Efi Code" level="h1" textAlign="center" />
        <Spacer height={16} />
        <Text 
          text="Arraste componentes da barra lateral para começar a construir sua página." 
          textAlign="center"
          color="#64748b"
        />
      </Element>
    </Frame>
  );
}

// Componente separado para acessar o hook useEditor
function EditorActions({ 
  siteId,
  viewMode,
  onViewModeChange,
  onSave, 
  onExport,
  onGenerateCode,
}: { 
  siteId: string | undefined;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: (query: any) => Promise<void>;
  onExport: (query: any) => void;
  onGenerateCode: (query: any) => void;
}) {
  const { query, canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const handlePreview = async () => {
    if (!siteId) return;
    await onSave(query);
    window.open(`/efi-code/${siteId}/preview`, '_blank');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'code') {
      onGenerateCode(query);
    }
    onViewModeChange(mode);
  };

  return (
    <>
      {/* Visual/Code Toggle */}
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(value) => value && handleViewModeChange(value as ViewMode)}
        className="border rounded-md"
      >
        <ToggleGroupItem value="visual" aria-label="Visual" className="px-3 gap-1.5">
          <Layers className="h-4 w-4" />
          <span className="text-xs">Visual</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="code" aria-label="Código" className="px-3 gap-1.5">
          <Code className="h-4 w-4" />
          <span className="text-xs">Código</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="icon"
        disabled={!canUndo}
        onClick={() => actions.history.undo()}
        title="Desfazer"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canRedo}
        onClick={() => actions.history.redo()}
        title="Refazer"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Ações
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Prévia
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport(query)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar HTML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Button */}
      <Button
        size="sm"
        onClick={() => onSave(query)}
      >
        <Save className="h-4 w-4 mr-2" />
        Salvar
      </Button>
    </>
  );
}
