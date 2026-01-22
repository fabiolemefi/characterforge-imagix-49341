import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

interface BlockImportData {
  name: string;
  description?: string;
  category?: string;
  icon_name?: string;
  html_content: string;
}

interface BlockImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (blocks: BlockImportData[]) => Promise<void>;
}

export const BlockImportModal = ({ open, onOpenChange, onImport }: BlockImportModalProps) => {
  const [content, setContent] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parseContent = (raw: string): BlockImportData[] => {
    const trimmed = raw.trim();
    
    // Try JSON first
    try {
      const parsed = JSON.parse(trimmed);
      
      // Array of blocks
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          name: item.name || 'Bloco Importado',
          description: item.description,
          category: item.category || 'layout',
          icon_name: item.icon_name || 'Code',
          html_content: item.html_content || item.html || '',
        }));
      }
      
      // Single block object
      if (typeof parsed === 'object' && (parsed.html_content || parsed.html || parsed.name)) {
        return [{
          name: parsed.name || 'Bloco Importado',
          description: parsed.description,
          category: parsed.category || 'layout',
          icon_name: parsed.icon_name || 'Code',
          html_content: parsed.html_content || parsed.html || '',
        }];
      }
    } catch {
      // Not JSON, treat as raw HTML
    }
    
    // Raw HTML - create a single block
    if (trimmed.startsWith('<') || trimmed.includes('<')) {
      return [{
        name: 'Bloco HTML Importado',
        category: 'layout',
        icon_name: 'Code',
        html_content: trimmed,
      }];
    }
    
    throw new Error('Formato não reconhecido. Cole HTML ou JSON válido.');
  };

  const handleImport = async () => {
    if (!content.trim()) {
      toast.error('Cole o conteúdo do bloco');
      return;
    }

    setIsImporting(true);
    try {
      const blocks = parseContent(content);
      
      if (blocks.length === 0) {
        toast.error('Nenhum bloco válido encontrado');
        return;
      }

      await onImport(blocks);
      
      toast.success(`${blocks.length} bloco(s) importado(s) com sucesso!`);
      setContent('');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar blocos');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Bloco
          </DialogTitle>
          <DialogDescription>
            Cole o JSON ou HTML do bloco que deseja importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Código do Bloco</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`// JSON completo:
{
  "name": "Hero Section",
  "category": "layout",
  "icon_name": "LayoutGrid",
  "html_content": "<div class='hero'>...</div>"
}

// Ou cole HTML diretamente:
<section class="hero">
  <h1>Título</h1>
  <p>Subtítulo</p>
</section>`}
              rows={14}
              className="w-full px-3 py-2 rounded-md border bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ tabSize: 2 }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="replace"
              checked={replaceExisting}
              onCheckedChange={(checked) => setReplaceExisting(!!checked)}
            />
            <Label htmlFor="replace" className="text-sm text-muted-foreground cursor-pointer">
              Substituir se já existir (mesmo nome)
            </Label>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">Formatos aceitos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>JSON completo:</strong> Objeto com name, category, icon_name, html_content</li>
              <li><strong>HTML puro:</strong> Código HTML que será convertido em bloco</li>
              <li><strong>Array JSON:</strong> Múltiplos blocos de uma vez</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !content.trim()}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
