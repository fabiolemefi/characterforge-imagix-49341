import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { ArrowLeft, Save, Download, Undo2, Redo2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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

// HTML generation functions moved to src/lib/efiCodeHtmlGenerator.ts


export default function EfiCodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: site, isLoading } = useEfiCodeSite(id);
  const { updateSite } = useEfiCodeSites();
  const { globalCss } = useEfiCodeConfig();
  const [siteName, setSiteName] = useState('');
  const [editorState, setEditorState] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>(defaultPageSettings);

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
    
    // Gera HTML completo com todas as configurações e CSS global
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
          </div>
          
          <div className="flex items-center gap-2">
            <EditorActions 
              siteId={id}
              onSave={handleSave} 
              onExport={handleExport}
            />
          </div>
        </header>

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Toolbox */}
          <aside className="w-56 border-r bg-background overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Toolbox />
            </ScrollArea>
          </aside>

          {/* Center - Viewport */}
          <main 
            className="flex-1 overflow-auto p-8"
            style={{ backgroundColor: pageSettings.backgroundColor }}
          >
            <div
              className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
              style={{ 
                minHeight: '600px',
                maxWidth: `${pageSettings.containerMaxWidth}px`,
              }}
            >
              <EditorFrame editorState={editorState} />
            </div>
          </main>

          {/* Right Sidebar - Settings */}
          <aside className="w-72 border-l bg-background overflow-hidden">
            <SettingsPanel 
              pageSettings={pageSettings}
              onPageSettingsChange={setPageSettings}
            />
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
  onSave, 
  onExport 
}: { 
  siteId: string | undefined;
  onSave: (query: any) => Promise<void>;
  onExport: (query: any) => void;
}) {
  const { query, canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const handlePreview = async () => {
    if (!siteId) return;
    // Salva antes de abrir a prévia
    await onSave(query);
    window.open(`/efi-code/${siteId}/preview`, '_blank');
  };

  return (
    <>
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
      <div className="w-px h-6 bg-border mx-2" />
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreview}
      >
        <Eye className="h-4 w-4 mr-2" />
        Prévia
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onExport(query)}
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar HTML
      </Button>
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
