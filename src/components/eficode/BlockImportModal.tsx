import React, { useState, useMemo } from 'react';
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
import { Upload, Loader2, Package, AlertCircle } from 'lucide-react';

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

// Helper: Format block name "HERO SECTION (xyz)" → "Hero Section"
const formatBlockName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper: Detect category based on block name
const detectCategory = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('hero') || lower.includes('header') || lower.includes('banner')) return 'layout';
  if (lower.includes('footer') || lower.includes('nav')) return 'layout';
  if (lower.includes('text') || lower.includes('title') || lower.includes('heading')) return 'text';
  if (lower.includes('image') || lower.includes('gallery') || lower.includes('media')) return 'media';
  if (lower.includes('button') || lower.includes('form') || lower.includes('cta')) return 'interactive';
  if (lower.includes('card') || lower.includes('grid') || lower.includes('list')) return 'layout';
  return 'layout';
};

// Helper: Detect icon based on block name
const detectIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('hero')) return 'LayoutTemplate';
  if (lower.includes('header') || lower.includes('nav')) return 'Menu';
  if (lower.includes('footer')) return 'PanelBottom';
  if (lower.includes('text') || lower.includes('content')) return 'Type';
  if (lower.includes('image') || lower.includes('gallery')) return 'Image';
  if (lower.includes('button') || lower.includes('cta')) return 'MousePointer';
  if (lower.includes('grid')) return 'Grid3x3';
  if (lower.includes('card')) return 'Square';
  if (lower.includes('list')) return 'List';
  if (lower.includes('form')) return 'FileInput';
  if (lower.includes('section') || lower.includes('split')) return 'Layers';
  if (lower.includes('banner')) return 'Image';
  return 'Code';
};

// Helper: Replace [placeholder] with JSON values
const replacePlaceholders = (html: string, props: Record<string, any>): string => {
  let result = html;
  
  for (const [key, value] of Object.entries(props)) {
    const placeholder = new RegExp(`\\[${key}\\]`, 'g');
    result = result.replace(placeholder, String(value ?? ''));
  }
  
  return result;
};

// Helper: Extract HTML and JSON from block content
const extractHtmlAndJson = (content: string): { html: string; props: Record<string, any> } => {
  // Find the last JSON object in the content (after HTML)
  // Match from the last { that starts a line or has whitespace before
  const jsonMatch = content.match(/(\{[\s\S]*\})\s*$/);
  
  if (jsonMatch) {
    const jsonStr = jsonMatch[1];
    const jsonStartIndex = content.lastIndexOf(jsonStr);
    const html = content.slice(0, jsonStartIndex).trim();
    
    try {
      const props = JSON.parse(jsonStr);
      return { html, props };
    } catch {
      // Invalid JSON, return full content as HTML
      return { html: content, props: {} };
    }
  }
  
  return { html: content, props: {} };
};

// Parse multiple blocks with <!-- BLOCO X: NAME --> pattern
const parseMultipleBlocks = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Regex to match each block section (supports multi-line comments with decorators)
  // [\s\S]*? captures ANY character including newlines between <!-- and BLOCO
  const blockRegex = /<!--[\s\S]*?BLOCO\s+\d+:\s*([^\n]+?)[\s\S]*?-->([\s\S]*?)(?=<!--[\s\S]*?BLOCO\s+\d+:|$)/gi;
  
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const rawName = match[1].trim();
    const blockContent = match[2].trim();
    
    if (!blockContent) continue;
    
    // Extract HTML and JSON props
    const { html, props } = extractHtmlAndJson(blockContent);
    
    if (!html) continue;
    
    // Replace placeholders with JSON values
    const finalHtml = replacePlaceholders(html, props);
    
    blocks.push({
      name: formatBlockName(rawName),
      category: detectCategory(rawName),
      icon_name: detectIcon(rawName),
      html_content: finalHtml,
    });
  }
  
  return blocks;
};

// Parse single HTML + JSON (no block comments)
const parseSingleHtmlWithJson = (content: string): BlockImportData[] => {
  const { html, props } = extractHtmlAndJson(content);
  
  if (!html) {
    throw new Error('Nenhum HTML válido encontrado');
  }
  
  const finalHtml = replacePlaceholders(html, props);
  
  // Try to detect a name from the HTML structure
  let name = 'Bloco HTML Importado';
  const sectionMatch = html.match(/<section[^>]*class="([^"]+)"/i);
  if (sectionMatch) {
    const className = sectionMatch[1].split(' ')[0];
    if (className && !className.startsWith('[')) {
      name = formatBlockName(className.replace(/-/g, ' '));
    }
  }
  
  return [{
    name,
    category: 'layout',
    icon_name: 'Code',
    html_content: finalHtml,
  }];
};

export const BlockImportModal = ({ open, onOpenChange, onImport }: BlockImportModalProps) => {
  const [content, setContent] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Preview detected blocks
  const detectedBlocks = useMemo((): BlockImportData[] | null => {
    if (!content.trim()) return null;
    
    try {
      return parseContent(content);
    } catch {
      return null;
    }
  }, [content]);

  const parseContent = (raw: string): BlockImportData[] => {
    const trimmed = raw.trim();
    
    // 1. Try JSON first (backwards compatibility)
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
      // Not JSON, continue to other formats
    }
    
    // 2. Check for block comments pattern <!-- BLOCO X: NAME --> (supports multi-line)
    // Use non-global regex for test() to avoid index consumption issues
    const hasBlockComments = /<!--[\s\S]*?BLOCO\s+\d+:/i.test(trimmed);
    if (hasBlockComments) {
      const blocks = parseMultipleBlocks(trimmed);
      if (blocks.length > 0) {
        return blocks;
      }
    }
    
    // 3. Raw HTML with optional trailing JSON
    if (trimmed.startsWith('<') || trimmed.includes('<')) {
      return parseSingleHtmlWithJson(trimmed);
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

  const blockCount = detectedBlocks?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Bloco
          </DialogTitle>
          <DialogDescription>
            Cole o JSON, HTML ou blocos com comentários que deseja importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Código do Bloco</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`// Formato com comentários:
<!-- ===== BLOCO 1: HERO SECTION ===== -->
<section class="[sectionClass]">
  <h1>[title]</h1>
</section>
{
  "sectionClass": "bg-white",
  "title": "Título Principal"
}

// Ou JSON/HTML simples...`}
              rows={12}
              className="w-full px-3 py-2 rounded-md border bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ tabSize: 2 }}
            />
          </div>

          {/* Preview of detected blocks */}
          {content.trim() && (
            <div className={`p-3 rounded-md border ${blockCount > 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
              {blockCount > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <Package className="h-4 w-4" />
                    Detectados: {blockCount} bloco{blockCount !== 1 ? 's' : ''}
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    {detectedBlocks?.map((block, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-foreground">•</span>
                        <span className="font-medium">{block.name}</span>
                        <span className="text-xs text-muted-foreground">({block.category})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Nenhum bloco detectado. Verifique o formato.
                </div>
              )}
            </div>
          )}

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
              <li><strong>Blocos com comentários:</strong> <code className="text-xs bg-muted px-1 rounded">{`<!-- BLOCO 1: NOME -->`}</code> + HTML + JSON</li>
              <li><strong>HTML + JSON:</strong> Código HTML seguido de objeto JSON com valores dos placeholders</li>
              <li><strong>JSON completo:</strong> Objeto ou array com name, category, html_content</li>
              <li><strong>HTML puro:</strong> Código HTML que será convertido em bloco</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isImporting || blockCount === 0}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {blockCount > 0 ? `${blockCount} bloco${blockCount !== 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
