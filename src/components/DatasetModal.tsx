import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Database, Upload, FileText, Loader2, Save, Files } from 'lucide-react';
import { useEmailDatasets } from '@/hooks/useEmailDatasets';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DatasetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DatasetModal = ({ open, onOpenChange }: DatasetModalProps) => {
  const {
    dataset,
    loading,
    saving,
    extracting,
    saveDataset,
    extractFromPdf,
    formatExtractedContent,
  } = useEmailDatasets();

  const [content, setContent] = useState('');
  const [name, setName] = useState('Dataset Principal');
  const [isDragging, setIsDragging] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync state with loaded dataset
  useEffect(() => {
    if (dataset) {
      setContent(dataset.content);
      setName(dataset.name);
    }
  }, [dataset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');

    if (files.length > 0) {
      await processMultipleFiles(files);
    }
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
    
    if (files.length > 0) {
      await processMultipleFiles(files);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processMultipleFiles = async (files: File[]) => {
    setTotalFiles(files.length);
    setProcessingQueue(files);
    let currentContent = content;
    
    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i + 1);
      
      const extractedContent = await extractFromPdf(files[i]);
      
      if (extractedContent) {
        currentContent = formatExtractedContent(currentContent, extractedContent);
        setContent(currentContent);
      }
    }
    
    // Reset queue state
    setTotalFiles(0);
    setCurrentFileIndex(0);
    setProcessingQueue([]);
    
    if (files.length > 1) {
      toast({
        title: 'PDFs processados',
        description: `${files.length} arquivos foram extraídos e adicionados ao dataset`,
      });
    }
  };

  const handleSave = async () => {
    await saveDataset(content, name);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dataset de Conteúdos para Emails
          </DialogTitle>
          <DialogDescription>
            Adicione conteúdos de emails para usar como referência. Você pode digitar ou importar de PDFs (suporta múltiplos emails por arquivo).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Name input */}
          <div>
            <Label htmlFor="dataset-name">Nome do Dataset</Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do dataset"
              className="mt-1"
            />
          </div>

          {/* Drop zone for PDF */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              extracting && "pointer-events-none opacity-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !extracting && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {extracting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="space-y-2 w-full max-w-xs">
                  {totalFiles > 1 ? (
                    <>
                      <p className="text-sm font-medium">
                        Processando {currentFileIndex} de {totalFiles} PDFs...
                      </p>
                      <Progress value={(currentFileIndex / totalFiles) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {processingQueue[currentFileIndex - 1]?.name || 'Extraindo...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Extraindo conteúdo do PDF...</p>
                      <Progress value={undefined} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Usando IA para extrair e formatar o conteúdo
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-muted">
                  <Files className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  Arraste PDFs aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Você pode selecionar vários arquivos de uma vez
                </p>
              </div>
            )}
          </div>

          {/* Content textarea */}
          <div className="flex-1 flex flex-col min-h-0">
            <Label htmlFor="dataset-content" className="mb-1 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Conteúdo do Dataset
            </Label>
            <Textarea
              id="dataset-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Cole aqui o conteúdo dos seus emails...

Formato sugerido:

Email sobre [Título do Email]
----------------------------------------------------------

[Conteúdo do email em markdown]

## Título
Texto do email...

[BOTÃO] Texto do botão

---

Email sobre [Próximo Email]
----------------------------------------------------------

...`}
              className="flex-1 resize-none font-mono text-sm min-h-[300px]"
              disabled={loading || extracting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: Dataset XX seguido do conteúdo (mais recentes no topo)
            </p>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{content.length.toLocaleString()} caracteres</span>
              {dataset?.updated_at && (
                <span>
                  Última atualização: {new Date(dataset.updated_at).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || extracting}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Dataset
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
