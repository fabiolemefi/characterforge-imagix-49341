import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { ArrowLeft, Save, Undo2, Redo2, Eye, Download, Monitor, Tablet, Smartphone, Code, Layers, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useEfiCodeSite, useEfiCodeSites, PageSettings, defaultPageSettings } from '@/hooks/useEfiCodeSites';
import { useEfiCodeConfig } from '@/hooks/useEfiCodeConfig';
import { Toolbox } from '@/components/eficode/editor/Toolbox';
import { SettingsPanel } from '@/components/eficode/editor/SettingsPanel';
import { generateFullHtml } from '@/lib/efiCodeHtmlGenerator';
import { EfiCodeProvider } from '@/components/eficode/EfiCodeContext';
import { Container, Text, Heading, Button as CraftButton, Image, Divider, Spacer, HtmlBlock } from '@/components/eficode/user-components';

const resolvers = {
  Container,
  Text,
  Heading,
  Button: CraftButton,
  Image,
  Divider,
  Spacer,
  HtmlBlock,
  'Bloco HTML': HtmlBlock,
  // Alias for backward compatibility
  'Element': Container // Fallback for generic Elements
};

type ViewMode = 'visual' | 'code';
type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const viewportWidths: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px'
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
  
  // State for tracking unsaved changes
  const [hasEditorChanges, setHasEditorChanges] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for original values comparison
  const originalSiteNameRef = useRef<string>('');
  const originalPageSettingsRef = useRef<PageSettings>(defaultPageSettings);
  const isInitialLoadRef = useRef(true);
  
  // Callback ref for preview after save
  const pendingPreviewRef = useRef(false);

  useEffect(() => {
    if (site) {
      setSiteName(site.name);
      if (site.content && Object.keys(site.content).length > 0) {
        setEditorState(JSON.stringify(site.content));
      }
      if (site.page_settings) {
        setPageSettings(site.page_settings);
      }
      
      // Set original refs on initial load
      if (isInitialLoadRef.current) {
        originalSiteNameRef.current = site.name;
        originalPageSettingsRef.current = site.page_settings || defaultPageSettings;
        isInitialLoadRef.current = false;
      }
    }
  }, [site]);

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!site || isInitialLoadRef.current) return false;
    
    const nameChanged = siteName !== originalSiteNameRef.current;
    const settingsChanged = JSON.stringify(pageSettings) !== JSON.stringify(originalPageSettingsRef.current);
    
    return nameChanged || settingsChanged || hasEditorChanges;
  }, [site, siteName, pageSettings, hasEditorChanges]);

  // Block internal navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Block browser close/refresh when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(async (query: any) => {
    if (!id) return;
    
    setIsSaving(true);
    const serialized = query.serialize();
    
    try {
      await updateSite.mutateAsync({
        id,
        name: siteName,
        content: JSON.parse(serialized),
        page_settings: pageSettings
      });
      
      // Reset original values after successful save
      originalSiteNameRef.current = siteName;
      originalPageSettingsRef.current = pageSettings;
      setHasEditorChanges(false);
      
      toast.success('Site salvo com sucesso!');
      
      // If there's a pending preview, open it
      if (pendingPreviewRef.current) {
        pendingPreviewRef.current = false;
        window.open(`/efi-code/${id}/preview`, '_blank');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      pendingPreviewRef.current = false;
    } finally {
      setIsSaving(false);
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

  const handleEditorChangeStatus = useCallback((hasChanges: boolean) => {
    setHasEditorChanges(hasChanges);
  }, []);

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
    <EfiCodeProvider globalCss={globalCss}>
      <Editor resolver={resolvers}>
        <div className="h-screen flex flex-col bg-background">
          {/* Header */}
          <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/efi-code')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Input 
                value={siteName} 
                onChange={e => setSiteName(e.target.value)} 
                className="w-64 font-medium" 
                placeholder="Nome do site" 
              />
              
              {/* Responsiveness Toggles */}
              <ToggleGroup 
                type="single" 
                value={viewportSize} 
                onValueChange={value => value && setViewportSize(value as ViewportSize)} 
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
                onEditorChangeStatus={handleEditorChangeStatus}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                onPreviewRequest={() => setShowPreviewDialog(true)}
              />
            </div>
          </header>

          {/* Main Editor Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Toolbox + Settings */}
            <aside className="w-64 border-r bg-background overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <Toolbox pageSettings={pageSettings} onPageSettingsChange={setPageSettings} />
              </ScrollArea>
            </aside>

            {/* Center - Viewport */}
            <main className="flex-1 overflow-auto" style={{
              backgroundColor: pageSettings.backgroundColor === 'transparent' 
                ? 'transparent' 
                : pageSettings.backgroundColor,
              backgroundImage: pageSettings.backgroundImage 
                ? `url(${pageSettings.backgroundImage})` 
                : undefined,
              backgroundSize: pageSettings.backgroundSize || 'cover',
              backgroundPosition: pageSettings.backgroundPosition || 'center',
              backgroundAttachment: pageSettings.backgroundAttachment || 'scroll',
              backgroundRepeat: pageSettings.backgroundRepeat || 'no-repeat',
            }}>
              {/* Inject Global CSS scoped to viewport */}
              <style dangerouslySetInnerHTML={{ __html: globalCss }} />
              
              {viewMode === 'visual' ? (
                <div 
                  className="mx-auto overflow-hidden transition-all duration-300" 
                  style={{
                    minHeight: '600px',
                    maxWidth: viewportSize === 'desktop' ? `${pageSettings.containerMaxWidth}px` : viewportWidths[viewportSize],
                    width: viewportWidths[viewportSize],
                    paddingTop: `${pageSettings.paddingTop || 0}px`,
                    paddingBottom: `${pageSettings.paddingBottom || 0}px`,
                    paddingLeft: `${pageSettings.paddingLeft || 0}px`,
                    paddingRight: `${pageSettings.paddingRight || 0}px`,
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

        {/* Navigation Blocker Dialog */}
        {blocker.state === 'blocked' && (
          <AlertDialog open>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
                <AlertDialogDescription>
                  Você tem alterações que não foram salvas. Se sair agora, essas alterações serão perdidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => blocker.reset?.()}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => blocker.proceed?.()}>
                  Sair sem salvar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Preview Confirmation Dialog */}
        <AlertDialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualizar Prévia
              </AlertDialogTitle>
              <AlertDialogDescription>
                Para visualizar a prévia, é necessário salvar as alterações atuais primeiro.
                <br /><br />
                Deseja salvar e continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <PreviewConfirmButton 
                siteId={id}
                onSave={handleSave}
                onClose={() => setShowPreviewDialog(false)}
                pendingPreviewRef={pendingPreviewRef}
              />
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Editor>
    </EfiCodeProvider>
  );
}

// Button component that can access query from useEditor
function PreviewConfirmButton({ 
  siteId, 
  onSave, 
  onClose,
  pendingPreviewRef
}: { 
  siteId: string | undefined;
  onSave: (query: any) => Promise<void>;
  onClose: () => void;
  pendingPreviewRef: React.MutableRefObject<boolean>;
}) {
  const { query } = useEditor();
  
  const handleConfirm = async () => {
    pendingPreviewRef.current = true;
    onClose();
    await onSave(query);
  };
  
  return (
    <AlertDialogAction onClick={handleConfirm}>
      Salvar e Abrir
    </AlertDialogAction>
  );
}

// Componente para o Frame que carrega o estado salvo
function EditorFrame({ editorState }: { editorState: string | null }) {
  const { actions } = useEditor();
  
  useEffect(() => {
    if (editorState) {
      try {
        const parsed = JSON.parse(editorState);
        console.log('[EfiCode] Deserializando estado:', parsed);

        // Log component types for debugging
        Object.entries(parsed).forEach(([nodeId, node]: [string, any]) => {
          if (node?.type?.resolvedName) {
            console.log(`[EfiCode] Node ${nodeId}: ${node.type.resolvedName}`);
          }
        });
        actions.deserialize(editorState);

        // Force ROOT to have transparent background to inherit from pageSettings
        setTimeout(() => {
          actions.setProp('ROOT', (props: any) => {
            props.background = 'transparent';
          });
        }, 0);
      } catch (error) {
        console.error('[EfiCode] Erro ao restaurar estado:', error);
      }
    }
  }, [editorState, actions]);
  
  return (
    <Frame>
      <Element is={Container} canvas background="transparent" padding={0} minHeight={400} />
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
  onEditorChangeStatus,
  hasUnsavedChanges,
  isSaving,
  onPreviewRequest
}: {
  siteId: string | undefined;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: (query: any) => Promise<void>;
  onExport: (query: any) => void;
  onGenerateCode: (query: any) => void;
  onEditorChangeStatus: (hasChanges: boolean) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onPreviewRequest: () => void;
}) {
  const { query, canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo()
  }));

  // Propagate editor change status to parent
  useEffect(() => {
    onEditorChangeStatus(canUndo);
  }, [canUndo, onEditorChangeStatus]);

  const handlePreview = async () => {
    if (!siteId) return;
    
    if (hasUnsavedChanges) {
      // Show dialog asking to save first
      onPreviewRequest();
    } else {
      // No changes, open preview directly
      window.open(`/efi-code/${siteId}/preview`, '_blank');
    }
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
        onValueChange={value => value && handleViewModeChange(value as ViewMode)} 
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

      {/* Save Button with Unsaved Indicator */}
      <Button 
        size="sm" 
        variant={hasUnsavedChanges ? "default" : "outline"}
        onClick={() => onSave(query)}
        disabled={isSaving}
        className={hasUnsavedChanges ? "relative" : ""}
      >
        {hasUnsavedChanges && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
        )}
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Salvando...' : (hasUnsavedChanges ? 'Salvar*' : 'Salvar')}
      </Button>
    </>
  );
}