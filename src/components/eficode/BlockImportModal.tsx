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
  const jsonMatch = content.match(/(\{[\s\S]*\})\s*$/);
  
  if (jsonMatch) {
    const jsonStr = jsonMatch[1];
    const jsonStartIndex = content.lastIndexOf(jsonStr);
    const html = content.slice(0, jsonStartIndex).trim();
    
    try {
      const props = JSON.parse(jsonStr);
      return { html, props };
    } catch {
      return { html: content, props: {} };
    }
  }
  
  return { html: content, props: {} };
};

// Helper: Detect category from HTML content
const detectCategoryFromHtml = (html: string): string => {
  const lower = html.toLowerCase();
  if (lower.includes('hero') || lower.includes('banner')) return 'layout';
  if (lower.includes('header') || lower.includes('nav')) return 'layout';
  if (lower.includes('footer')) return 'layout';
  if (lower.includes('grid') || lower.includes('card')) return 'layout';
  if (lower.includes('<h1') || lower.includes('<h2') || lower.includes('<p>')) return 'text';
  if (lower.includes('<img') || lower.includes('image')) return 'media';
  if (lower.includes('<button') || lower.includes('<form')) return 'interactive';
  return 'layout';
};

// Helper: Detect icon from HTML content
const detectIconFromHtml = (html: string): string => {
  const lower = html.toLowerCase();
  if (lower.includes('hero')) return 'LayoutTemplate';
  if (lower.includes('header') || lower.includes('nav')) return 'Menu';
  if (lower.includes('footer')) return 'PanelBottom';
  if (lower.includes('grid')) return 'Grid3x3';
  if (lower.includes('card')) return 'Square';
  if (lower.includes('<img')) return 'Image';
  if (lower.includes('<button')) return 'MousePointer';
  if (lower.includes('<form')) return 'FileInput';
  return 'Code';
};

// Helper: Detect name from HTML structure
const detectNameFromHtml = (html: string, index: number): string => {
  // Try to extract name from section/div class or id
  const classMatch = html.match(/<(?:section|div|article|header|footer)[^>]*class="([^"]+)"/i);
  if (classMatch) {
    const firstClass = classMatch[1].split(' ')[0];
    if (firstClass && !firstClass.includes('[') && !firstClass.startsWith('w-') && !firstClass.startsWith('bg-')) {
      return formatBlockName(firstClass.replace(/-/g, ' '));
    }
  }
  
  const idMatch = html.match(/id="([^"]+)"/i);
  if (idMatch && !idMatch[1].includes('[')) {
    return formatBlockName(idMatch[1].replace(/-/g, ' '));
  }
  
  // Try to detect from common patterns
  const lower = html.toLowerCase();
  if (lower.includes('hero')) return `Hero Section ${index}`;
  if (lower.includes('header')) return `Header ${index}`;
  if (lower.includes('footer')) return `Footer ${index}`;
  if (lower.includes('grid')) return `Grid ${index}`;
  if (lower.includes('card')) return `Card ${index}`;
  
  return `Bloco ${index}`;
};

// NEW: Parse HTML + JSON with @container"> delimiter
const parseHtmlWithTrailingJson = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Split by @container"> delimiter (and variations)
  // This handles: @container">, @container" >, @container (without quotes)
  const rawSegments = content.split(/@container[^<\n]*(?:>|\s|$)/i);
  
  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    
    // Find the last closing brace for JSON extraction
    const lastBraceIndex = trimmed.lastIndexOf('}');
    if (lastBraceIndex === -1) {
      // No JSON, check if it's just HTML
      if (trimmed.includes('<')) {
        const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
        if (cleanHtml) {
          blocks.push({
            name: detectNameFromHtml(cleanHtml, blocks.length + 1),
            category: detectCategoryFromHtml(cleanHtml),
            icon_name: detectIconFromHtml(cleanHtml),
            html_content: cleanHtml,
          });
        }
      }
      continue;
    }
    
    // Find the matching opening brace for the JSON by counting braces
    let braceCount = 0;
    let jsonStartIndex = -1;
    
    for (let i = lastBraceIndex; i >= 0; i--) {
      if (trimmed[i] === '}') braceCount++;
      if (trimmed[i] === '{') braceCount--;
      
      if (braceCount === 0) {
        jsonStartIndex = i;
        break;
      }
    }
    
    if (jsonStartIndex === -1) {
      // No valid JSON structure found, treat as HTML only
      if (trimmed.includes('<')) {
        const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
        if (cleanHtml) {
          blocks.push({
            name: detectNameFromHtml(cleanHtml, blocks.length + 1),
            category: detectCategoryFromHtml(cleanHtml),
            icon_name: detectIconFromHtml(cleanHtml),
            html_content: cleanHtml,
          });
        }
      }
      continue;
    }
    
    const jsonStr = trimmed.slice(jsonStartIndex, lastBraceIndex + 1);
    let html = trimmed.slice(0, jsonStartIndex).trim();
    
    // Clean HTML comments
    html = html.replace(/<!--[\s\S]*?-->/g, '').trim();
    
    if (!html || !html.includes('<')) continue;
    
    let props = {};
    try {
      props = JSON.parse(jsonStr);
    } catch {
      // Invalid JSON, keep HTML without replacement
    }
    
    const finalHtml = replacePlaceholders(html, props);
    
    blocks.push({
      name: detectNameFromHtml(html, blocks.length + 1),
      category: detectCategoryFromHtml(html),
      icon_name: detectIconFromHtml(html),
      html_content: finalHtml,
    });
  }
  
  return blocks;
};

// Parse multiple blocks with <!-- BLOCO X: NAME --> pattern
const parseMultipleBlocks = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  const blockRegex = /<!--[\s\S]*?BLOCO\s+\d+:\s*([^\n]+?)[\s\S]*?-->([\s\S]*?)(?=<!--[\s\S]*?BLOCO\s+\d+:|$)/gi;
  
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const rawName = match[1].trim();
    const blockContent = match[2].trim();
    
    if (!blockContent) continue;
    
    const { html, props } = extractHtmlAndJson(blockContent);
    if (!html) continue;
    
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
      
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          name: item.name || 'Bloco Importado',
          description: item.description,
          category: item.category || 'layout',
          icon_name: item.icon_name || 'Code',
          html_content: item.html_content || item.html || '',
        }));
      }
      
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
    
    // 2. NEW: Try HTML + JSON interleaved format (priority - simpler format)
    if (trimmed.includes('<') && trimmed.includes('{')) {
      const blocks = parseHtmlWithTrailingJson(trimmed);
      if (blocks.length > 0) {
        return blocks;
      }
    }
    
    // 3. Check for block comments pattern <!-- BLOCO X: NAME --> (legacy support)
    const hasBlockComments = /<!--[\s\S]*?BLOCO\s+\d+:/i.test(trimmed);
    if (hasBlockComments) {
      const blocks = parseMultipleBlocks(trimmed);
      if (blocks.length > 0) {
        return blocks;
      }
    }
    
    // 4. Raw HTML without JSON
    if (trimmed.startsWith('<')) {
      const cleanHtml = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();
      if (cleanHtml) {
        return [{
          name: detectNameFromHtml(cleanHtml, 1),
          category: detectCategoryFromHtml(cleanHtml),
          icon_name: detectIconFromHtml(cleanHtml),
          html_content: cleanHtml,
        }];
      }
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
