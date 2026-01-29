import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { UnifiedIframe } from '@/components/eficode/editor/UnifiedIframe';
import { BlockList } from '@/components/eficode/editor/BlockList';
import { generateFullHtml } from '@/lib/efiCodeHtmlGenerator';
import { useEfiCodeEditorStore } from '@/stores/efiCodeEditorStore';

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
  
  // Zustand store
  const {
    blocks,
    selectedBlockId,
    selectBlock,
    addBlock,
    removeBlock,
    duplicateBlock,
    updateBlockHtml,
    reorderBlocks,
    serialize,
    deserialize,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = useEfiCodeEditorStore();
  
  const [siteName, setSiteName] = useState('');
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
  const originalBlocksRef = useRef<string>('');
  const isInitialLoadRef = useRef(true);
  
  // Callback ref for preview after save
  const pendingPreviewRef = useRef(false);
  
  // Ref to prevent editor reload after save
  const justSavedRef = useRef(false);

  // Iframe ref for editing control
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load site data into store
  useEffect(() => {
    if (site) {
      // If we just saved OR are currently saving, don't reload the editor
      if (justSavedRef.current || isSaving) {
        return;
      }
      
      setSiteName(site.name);
      if (site.content && Object.keys(site.content).length > 0) {
        deserialize(site.content);
      } else {
        reset();
      }
      if (site.page_settings) {
        setPageSettings(site.page_settings);
      }
      
      // Set original refs on initial load
      if (isInitialLoadRef.current) {
        originalSiteNameRef.current = site.name;
        originalPageSettingsRef.current = site.page_settings || defaultPageSettings;
        originalBlocksRef.current = JSON.stringify(site.content || {});
        isInitialLoadRef.current = false;
      }
    }
  }, [site, isSaving, deserialize, reset]);

  // Track changes
  useEffect(() => {
    if (!site || isInitialLoadRef.current) return;
    
    const currentBlocks = JSON.stringify(serialize());
    const hasBlockChanges = currentBlocks !== originalBlocksRef.current;
    setHasEditorChanges(hasBlockChanges);
  }, [blocks, site, serialize]);

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!site || isInitialLoadRef.current) return false;
    
    const nameChanged = siteName !== originalSiteNameRef.current;
    const settingsChanged = JSON.stringify(pageSettings) !== JSON.stringify(originalPageSettingsRef.current);
    
    return nameChanged || settingsChanged || hasEditorChanges;
  }, [site, siteName, pageSettings, hasEditorChanges]);

  // State for navigation blocking dialog
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Handle back button with unsaved changes check
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingNavigation('/efi-code');
      setShowExitDialog(true);
    } else {
      navigate('/efi-code');
    }
  }, [hasUnsavedChanges, navigate]);

  // Confirm exit without saving
  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  }, [navigate, pendingNavigation]);

  // Cancel exit
  const handleCancelExit = useCallback(() => {
    setShowExitDialog(false);
    setPendingNavigation(null);
  }, []);

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

  // Save handler
  const handleSave = useCallback(async () => {
    if (!id) return;
    
    setIsSaving(true);
    const serialized = serialize();
    
    // Mark BEFORE save to prevent reload from query invalidation
    justSavedRef.current = true;
    
    try {
      await updateSite.mutateAsync({
        id,
        name: siteName,
        content: serialized,
        page_settings: pageSettings
      });
      
      // Reset original values after successful save
      originalSiteNameRef.current = siteName;
      originalPageSettingsRef.current = pageSettings;
      originalBlocksRef.current = JSON.stringify(serialized);
      setHasEditorChanges(false);
      
      toast.success('Site salvo com sucesso!');
      
      // Keep flag true for a bit longer to handle async refetch
      setTimeout(() => {
        justSavedRef.current = false;
      }, 1000);
      
      // If there's a pending preview, open it
      if (pendingPreviewRef.current) {
        pendingPreviewRef.current = false;
        window.open(`https://martech-efi.lovable.app/efi-code/${id}/preview`, '_blank');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      justSavedRef.current = false;
      pendingPreviewRef.current = false;
    } finally {
      setIsSaving(false);
    }
  }, [id, siteName, pageSettings, updateSite, serialize]);

  // Export handler
  const handleExport = useCallback(() => {
    const serialized = serialize();
    const html = generateFullHtml(serialized, siteName, pageSettings, globalCss);
    
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
  }, [siteName, pageSettings, globalCss, serialize]);

  // Generate code for preview
  const handleGenerateCode = useCallback(() => {
    const serialized = serialize();
    const html = generateFullHtml(serialized, siteName, pageSettings, globalCss);
    setCodeContent(html);
  }, [siteName, pageSettings, globalCss, serialize]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === 'code') {
      handleGenerateCode();
    }
    setViewMode(mode);
  }, [handleGenerateCode]);

  // Preview handler
  const handlePreview = useCallback(() => {
    if (!id) return;
    
    if (hasUnsavedChanges) {
      setShowPreviewDialog(true);
    } else {
      window.open(`https://martech-efi.lovable.app/efi-code/${id}/preview`, '_blank');
    }
  }, [id, hasUnsavedChanges]);

  // Preview confirm handler
  const handlePreviewConfirm = useCallback(async () => {
    pendingPreviewRef.current = true;
    setShowPreviewDialog(false);
    await handleSave();
  }, [handleSave]);

  // Block interaction handlers
  const handleBlockClick = useCallback((blockId: string) => {
    selectBlock(blockId);
  }, [selectBlock]);

  const handleBlockDoubleClick = useCallback((blockId: string) => {
    selectBlock(blockId);
    // Enable editing in iframe
    const iframe = document.querySelector('iframe[title="Efi Code Editor Preview"]') as any;
    if (iframe?.enableEditing) {
      iframe.enableEditing(blockId);
    }
  }, [selectBlock]);

  const handleBlockEdit = useCallback((blockId: string, newHtml: string) => {
    updateBlockHtml(blockId, newHtml);
  }, [updateBlockHtml]);

  // Block list handlers
  const handleMoveUp = useCallback((blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index > 0) {
      reorderBlocks(index, index - 1);
    }
  }, [blocks, reorderBlocks]);

  const handleMoveDown = useCallback((blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index < blocks.length - 1) {
      reorderBlocks(index, index + 1);
    }
  }, [blocks, reorderBlocks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave]);

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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
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
            disabled={!canUndo()} 
            onClick={undo} 
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={!canRedo()} 
            onClick={redo} 
            title="Refazer (Ctrl+Shift+Z)"
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
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Button with Unsaved Indicator */}
          <Button 
            size="sm" 
            variant={hasUnsavedChanges ? "default" : "outline"}
            onClick={handleSave}
            disabled={isSaving}
            className={hasUnsavedChanges ? "relative" : ""}
          >
            {hasUnsavedChanges && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
            )}
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : (hasUnsavedChanges ? 'Salvar*' : 'Salvar')}
          </Button>
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
              onAddBlock={addBlock}
            />
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
          {viewMode === 'visual' ? (
            <div className="min-h-full flex justify-center">
              <div 
                className={`transition-all duration-300 ${pageSettings.containerClasses || ''}`}
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
                <UnifiedIframe
                  key={`iframe-${blocks.reduce((acc, b) => acc + b.html.length, 0)}`}
                  blocks={blocks}
                  globalCss={globalCss}
                  selectedBlockId={selectedBlockId}
                  viewportWidth="100%"
                  onBlockClick={handleBlockClick}
                  onBlockDoubleClick={handleBlockDoubleClick}
                  onBlockEdit={handleBlockEdit}
                />
              </div>
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

        {/* Right Sidebar - Block List + Settings */}
        <aside className="w-72 border-l bg-background overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Blocos ({blocks.length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <BlockList
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={selectBlock}
                onReorder={reorderBlocks}
                onDelete={removeBlock}
                onDuplicate={duplicateBlock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </div>
          </ScrollArea>
          <SettingsPanel />
        </aside>
      </div>

      {/* Navigation Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que não foram salvas. Se sair agora, essas alterações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExit}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogAction onClick={handlePreviewConfirm}>
              Salvar e Abrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
