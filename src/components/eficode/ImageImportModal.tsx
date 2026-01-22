import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEfiImageLibrary, EfiImageCategory } from '@/hooks/useEfiImageLibrary';
import { Upload, FileIcon, Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

interface ImageImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewItem {
  filename: string;
  exists: boolean;
}

interface ImportResult {
  filename: string;
  status: 'new' | 'existing' | 'replaced' | 'error';
  error?: string;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export const ImageImportModal = ({ open, onOpenChange }: ImageImportModalProps) => {
  const { categories, images, createImage, uploadImage } = useEfiImageLibrary();
  
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: '' });
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleReset = () => {
    setZipFile(null);
    setPreview([]);
    setReplaceExisting(false);
    setSelectedCategory('');
    setIsLoading(false);
    setIsImporting(false);
    setProgress({ current: 0, total: 0, filename: '' });
    setResults(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const isImageFile = (filename: string): boolean => {
    const lower = filename.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
  };

  const getZipPreview = async (file: File): Promise<PreviewItem[]> => {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    
    const imageFilenames: string[] = [];
    
    zipContent.forEach((relativePath, zipFile) => {
      if (!zipFile.dir) {
        const filename = (relativePath.split('/').pop() || relativePath).toLowerCase();
        if (isImageFile(filename)) {
          imageFilenames.push(filename);
        }
      }
    });

    // Check existing images by name
    const existingNames = new Set(images.map(img => img.name.toLowerCase()));
    
    return imageFilenames.map(filename => {
      const name = filename.replace(/\.[^/.]+$/, '').toLowerCase();
      return {
        filename,
        exists: existingNames.has(name),
      };
    });
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
        toast.error('Nenhuma imagem encontrada no ZIP');
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
    const importResults: ImportResult[] = [];

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      
      const { data: { user } } = await supabase.auth.getUser();
      const category = categories.find(c => c.id === selectedCategory);
      const existingNames = new Set(images.map(img => img.name.toLowerCase()));
      
      let processed = 0;
      
      const imageFiles: { filename: string; file: JSZip.JSZipObject }[] = [];
      
      zipContent.forEach((relativePath, file) => {
        if (!file.dir) {
          const filename = (relativePath.split('/').pop() || relativePath).toLowerCase();
          if (isImageFile(filename)) {
            imageFiles.push({ filename, file });
          }
        }
      });

      for (const { filename, file } of imageFiles) {
        processed++;
        setProgress({ current: processed, total: imageFiles.length, filename });
        
        const name = filename.replace(/\.[^/.]+$/, '');
        const exists = existingNames.has(name.toLowerCase());
        
        if (exists && !replaceExisting) {
          importResults.push({ filename, status: 'existing' });
          continue;
        }

        try {
          // Get file content
          const content = await file.async('blob');
          const mimeType = filename.endsWith('.svg') ? 'image/svg+xml' : 
                          filename.endsWith('.png') ? 'image/png' :
                          filename.endsWith('.gif') ? 'image/gif' :
                          filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          
          const imageFile = new File([content], filename, { type: mimeType });
          
          // Upload to storage
          const url = await uploadImage(imageFile, category?.slug);

          if (exists && replaceExisting) {
            // Find and update existing image
            const existingImage = images.find(img => img.name.toLowerCase() === name.toLowerCase());
            if (existingImage) {
              await supabase
                .from('efi_library_images')
                .update({ url })
                .eq('id', existingImage.id);
            }
            importResults.push({ filename, status: 'replaced' });
          } else {
            // Insert new record
            await supabase
              .from('efi_library_images')
              .insert({
                name,
                url,
                category_id: selectedCategory || null,
                is_active: true,
                created_by: user?.id,
                tags: [],
              });
            
            importResults.push({ filename, status: 'new' });
          }
        } catch (error: any) {
          importResults.push({ filename, status: 'error', error: error.message });
        }
      }

      setResults(importResults);
      
      const newCount = importResults.filter(r => r.status === 'new').length;
      const replacedCount = importResults.filter(r => r.status === 'replaced').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;
      
      if (errorCount > 0) {
        toast.warning(`Importação concluída com ${errorCount} erro(s)`);
      } else {
        toast.success(`${newCount} nova(s), ${replacedCount} substituída(s)`);
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
          <DialogTitle>Importar Imagens</DialogTitle>
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
                      {result.status === 'new' && 'Adicionada'}
                      {result.status === 'replaced' && 'Substituída'}
                      {result.status === 'existing' && 'Ignorada'}
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
                Importando imagens...
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
                {/* Category selection */}
                <div className="space-y-2">
                  <Label>Categoria (opcional)</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem categoria</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Replace checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="replace-images"
                    checked={replaceExisting}
                    onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                  />
                  <Label htmlFor="replace-images" className="text-sm cursor-pointer">
                    Substituir imagens existentes com mesmo nome
                  </Label>
                </div>

                {/* Preview list */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Prévia ({preview.length} imagens)
                  </div>
                  
                  <ScrollArea className="h-[180px] border rounded-lg p-3">
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
                            <span className="text-xs text-green-600">nova</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Summary */}
                  <div className="text-xs text-muted-foreground">
                    Total: {preview.length} | Novas: {newCount} | 
                    {replaceExisting 
                      ? ` Substituir: ${existingCount}`
                      : ` Ignoradas: ${existingCount}`
                    }
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImport} disabled={toImportCount === 0}>
                    Importar {toImportCount} imagem{toImportCount !== 1 ? 'ns' : ''}
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
