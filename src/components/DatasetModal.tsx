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
import { Database, Upload, FileText, Loader2, Save } from 'lucide-react';
import { useEmailDatasets } from '@/hooks/useEmailDatasets';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(f => f.type === 'application/pdf');

    if (pdfFile) {
      await processFile(pdfFile);
    }
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await processFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
    const extractedContent = await extractFromPdf(file);
    if (extractedContent) {
      // Extract title from filename (remove extension)
      const title = file.name.replace(/\.pdf$/i, '');
      const formattedContent = formatExtractedContent(content, extractedContent, title);
      setContent(formattedContent);
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
            Adicione conteúdos de emails para usar como referência. Você pode digitar ou importar de PDFs.
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
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {extracting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="space-y-2 w-full max-w-xs">
                  <p className="text-sm font-medium">Extraindo conteúdo do PDF...</p>
                  <Progress value={undefined} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Usando IA para extrair e formatar o conteúdo
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  Arraste um PDF aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  O conteúdo será extraído automaticamente e adicionado ao dataset
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
