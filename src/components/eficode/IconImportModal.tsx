import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEfiLibraryIcons, IconImportResult } from '@/hooks/useEfiLibraryIcons';
import { Upload, FileIcon, Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IconImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewItem {
  filename: string;
  exists: boolean;
}

export const IconImportModal = ({ open, onOpenChange }: IconImportModalProps) => {
  const { getZipPreview, importIconsFromZip } = useEfiLibraryIcons();
  
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: '' });
  const [results, setResults] = useState<IconImportResult[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleReset = () => {
    setZipFile(null);
    setPreview([]);
    setReplaceExisting(false);
    setIsLoading(false);
    setIsImporting(false);
    setProgress({ current: 0, total: 0, filename: '' });
    setResults(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Por favor, selecione um arquivo .zip');
      return;
    }

    setZipFile(file);
    setIsLoading(true);
    setResults(null);

    try {
      const items = await getZipPreview(file);
      if (items.length === 0) {
        toast.error('Nenhum arquivo SVG encontrado no ZIP');
        setZipFile(null);
        setPreview([]);
      } else {
        setPreview(items);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ler arquivo ZIP');
      setZipFile(null);
      setPreview([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    if (!zipFile) return;

    setIsImporting(true);
    setProgress({ current: 0, total: preview.length, filename: '' });

    try {
      const importResults = await importIconsFromZip(
        zipFile,
        replaceExisting,
        (current, total, filename) => {
          setProgress({ current, total, filename });
        }
      );
      
      setResults(importResults);
      
      const newCount = importResults.filter(r => r.status === 'new').length;
      const replacedCount = importResults.filter(r => r.status === 'replaced').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;
      
      if (errorCount > 0) {
        toast.warning(`Importação concluída com ${errorCount} erro(s)`);
      } else {
        toast.success(`${newCount} novo(s), ${replacedCount} substituído(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro na importação');
    } finally {
      setIsImporting(false);
    }
  };

  const newCount = preview.filter(p => !p.exists).length;
  const existingCount = preview.filter(p => p.exists).length;
  const toImportCount = replaceExisting ? preview.length : newCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Ícones</DialogTitle>
        </DialogHeader>

        {results ? (
          // Results view
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Importação concluída!
            </div>
            
            <ScrollArea className="h-[300px] border rounded-lg p-3">
              <div className="space-y-1">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm py-1">
                    {result.status === 'new' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {result.status === 'replaced' && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                    {result.status === 'existing' && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    {result.status === 'error' && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="truncate flex-1">{result.filename}</span>
                    <span className={cn(
                      "text-xs",
                      result.status === 'new' && "text-green-600",
                      result.status === 'replaced' && "text-blue-600",
                      result.status === 'existing' && "text-yellow-600",
                      result.status === 'error' && "text-red-600",
                    )}>
                      {result.status === 'new' && 'Adicionado'}
                      {result.status === 'replaced' && 'Substituído'}
                      {result.status === 'existing' && 'Ignorado'}
                      {result.status === 'error' && 'Erro'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : isImporting ? (
          // Importing progress view
          <div className="space-y-4 py-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Importando ícones...
              </p>
            </div>
            
            <Progress value={(progress.current / progress.total) * 100} />
            
            <div className="text-center text-sm text-muted-foreground">
              {progress.current} de {progress.total}
              {progress.filename && (
                <span className="block truncate text-xs mt-1">{progress.filename}</span>
              )}
            </div>
          </div>
        ) : (
          // File selection and preview view
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                isLoading && "opacity-50 pointer-events-none"
              )}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.zip';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
            >
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Arraste um arquivo .zip aqui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou clique para selecionar
                  </p>
                </>
              )}
            </div>

            {zipFile && preview.length > 0 && (
              <>
                {/* Replace checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="replace"
                    checked={replaceExisting}
                    onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                  />
                  <Label htmlFor="replace" className="text-sm cursor-pointer">
                    Substituir ícones existentes com mesmo nome
                  </Label>
                </div>

                {/* Preview list */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Prévia ({preview.length} ícones)
                  </div>
                  
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    <div className="space-y-1">
                      {preview.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm py-1">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate flex-1">{item.filename}</span>
                          {item.exists ? (
                            <span className={cn(
                              "text-xs",
                              replaceExisting ? "text-blue-600" : "text-yellow-600"
                            )}>
                              {replaceExisting ? 'substituir' : 'ignorar'}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600">novo</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Summary */}
                  <div className="text-xs text-muted-foreground">
                    Total: {preview.length} | Novos: {newCount} | 
                    {replaceExisting 
                      ? ` Substituir: ${existingCount}`
                      : ` Ignorados: ${existingCount}`
                    }
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImport} disabled={toImportCount === 0}>
                    Importar {toImportCount} ícone{toImportCount !== 1 ? 's' : ''}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
