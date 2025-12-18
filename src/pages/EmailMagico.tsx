import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Wand2 } from 'lucide-react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';

export default function EmailMagico() {
  const [modalOpen, setModalOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [htmlGenerated, setHtmlGenerated] = useState(false);
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Loading messages rotation
  useEffect(() => {
    if (!loading) return;

    const messages = [
      'Analisando briefing...',
      'Gerando estrutura HTML...',
      'Aplicando estilos...',
      'Finalizando layout...',
      'Processando com IA...',
    ];

    let index = 0;
    setLoadingMessage(messages[0]);

    const messageInterval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 5000);

    const timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(timerInterval);
    };
  }, [loading]);

  // Initialize GrapesJS when HTML is generated
  useEffect(() => {
    if (htmlGenerated && editorContainerRef.current && !editorRef.current) {
      editorRef.current = grapesjs.init({
        container: editorContainerRef.current,
        height: '100%',
        width: 'auto',
        storageManager: false,
        plugins: [grapesjsPresetWebpage],
        pluginsOpts: {
          [grapesjsPresetWebpage as any]: {
            blocksBasicOpts: {
              flexGrid: true,
            },
          },
        },
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
          ]
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Mobile', width: '375px', widthMedia: '480px' },
          ]
        }
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [htmlGenerated]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Atenção',
        description: 'Por favor, insira o conteúdo do email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setElapsedTime(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-email-magic', {
        body: { prompt: prompt.trim() }
      });

      if (error) throw error;

      if (!data.html) {
        throw new Error('Nenhum HTML foi gerado');
      }

      // Close modal and show editor
      setModalOpen(false);
      setHtmlGenerated(true);

      // Wait for editor to initialize then load HTML
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setComponents(data.html);
          editorRef.current.setStyle('');
        }
      }, 500);

      toast({
        title: 'Email gerado!',
        description: 'O HTML foi carregado no editor. Você pode continuar editando.',
      });

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Erro ao gerar email',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.getHtml();
    const css = editorRef.current.getCss();

    // Combine HTML and CSS
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;

    // Download file
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-magic-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'HTML exportado!',
      description: 'O arquivo foi baixado com sucesso.',
    });
  };

  const handleNewEmail = () => {
    setPrompt('');
    setHtmlGenerated(false);
    setModalOpen(true);
    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="h-14 border-b bg-card flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Email mágico</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewEmail}>
            <Wand2 className="h-4 w-4 mr-2" />
            Novo Email
          </Button>
          {htmlGenerated && (
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar HTML
            </Button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        {htmlGenerated ? (
          <div ref={editorContainerRef} className="h-full" />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/20">
            <div className="text-center text-muted-foreground">
              <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Clique em "Novo Email" para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Generation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Gerar Email com IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt">Conteúdo do Email</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Cole aqui o briefing/conteúdo do email que deseja gerar..."
                rows={12}
                className="mt-2 font-mono text-sm"
                disabled={loading}
              />
            </div>

            {loading && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{loadingMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo decorrido: {elapsedTime}s
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Gerar Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
