import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, ArrowLeft, Code, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedBlock {
  name: string;
  category: string;
  description: string;
  html_content: string;
  selected?: boolean;
}

interface HtmlToBlocksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (blocks: ExtractedBlock[]) => Promise<void>;
}

export function HtmlToBlocksModal({ open, onOpenChange, onImport }: HtmlToBlocksModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [htmlInput, setHtmlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractedBlocks, setExtractedBlocks] = useState<ExtractedBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!htmlInput.trim()) {
      toast.error('Cole o código HTML primeiro');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-html-blocks', {
        body: { html: htmlInput }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      const blocks = (data.blocks || []).map((b: ExtractedBlock) => ({
        ...b,
        selected: true
      }));

      if (blocks.length === 0) {
        setError('Nenhum bloco foi identificado no HTML. Tente com um código HTML diferente.');
        return;
      }

      setExtractedBlocks(blocks);
      setStep('preview');
      
      if (data.truncated) {
        toast.info('O HTML foi truncado por ser muito grande');
      }
    } catch (err: any) {
      console.error('Erro na análise:', err);
      setError(err.message || 'Erro ao analisar o HTML');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleBlock = (index: number) => {
    setExtractedBlocks(prev => 
      prev.map((block, i) => 
        i === index ? { ...block, selected: !block.selected } : block
      )
    );
  };

  const handleUpdateBlockName = (index: number, name: string) => {
    setExtractedBlocks(prev =>
      prev.map((block, i) =>
        i === index ? { ...block, name } : block
      )
    );
  };

  const handleImport = async () => {
    const selectedBlocks = extractedBlocks.filter(b => b.selected);
    
    if (selectedBlocks.length === 0) {
      toast.error('Selecione pelo menos um bloco');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(selectedBlocks);
      toast.success(`${selectedBlocks.length} bloco(s) importado(s) com sucesso!`);
      handleClose();
    } catch (err) {
      console.error('Erro ao importar:', err);
      toast.error('Erro ao importar blocos');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    setStep('input');
    setExtractedBlocks([]);
    setError(null);
  };

  const handleClose = () => {
    setStep('input');
    setHtmlInput('');
    setExtractedBlocks([]);
    setError(null);
    onOpenChange(false);
  };

  const selectedCount = extractedBlocks.filter(b => b.selected).length;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'layout': return 'bg-blue-500/10 text-blue-500';
      case 'texto': return 'bg-green-500/10 text-green-500';
      case 'midia': return 'bg-purple-500/10 text-purple-500';
      case 'interativo': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'input' ? 'Importar HTML com IA' : 'Blocos Detectados'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' 
              ? 'Cole o código HTML completo. A IA irá analisar e extrair blocos individuais reutilizáveis.'
              : `A IA identificou ${extractedBlocks.length} bloco(s) no HTML. Selecione os que deseja importar.`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="flex-1 space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="html-input" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Código HTML
              </Label>
              <textarea
                id="html-input"
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder={`<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <section class="hero">
    <h1>Título</h1>
    <p>Descrição</p>
  </section>
  <div class="features">
    ...
  </div>
</body>
</html>`}
                className="w-full h-[300px] px-3 py-2 rounded-md border bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ tabSize: 2 }}
              />
              <p className="text-xs text-muted-foreground">
                Cole uma página HTML completa. A IA irá remover CSS/JS e extrair apenas os blocos HTML estruturais.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="flex-1 py-4 pr-4">
            <div className="space-y-3">
              {extractedBlocks.map((block, index) => (
                <div 
                  key={index}
                  className={`border rounded-lg p-4 transition-colors ${
                    block.selected ? 'border-primary bg-primary/5' : 'border-border opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={block.selected}
                      onCheckedChange={() => handleToggleBlock(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={block.name}
                          onChange={(e) => handleUpdateBlockName(index, e.target.value)}
                          className="h-8 font-medium"
                        />
                        <Badge variant="secondary" className={getCategoryColor(block.category)}>
                          {block.category}
                        </Badge>
                      </div>
                      {block.description && (
                        <p className="text-sm text-muted-foreground">{block.description}</p>
                      )}
                      <div className="bg-muted/50 rounded p-2 max-h-24 overflow-hidden">
                        <code className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                          {block.html_content.substring(0, 200)}
                          {block.html_content.length > 200 && '...'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-shrink-0">
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing || !htmlInput.trim()}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={isImporting || selectedCount === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${selectedCount} Selecionado${selectedCount !== 1 ? 's' : ''}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
