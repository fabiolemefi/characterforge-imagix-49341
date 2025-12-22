import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Wand2 } from 'lucide-react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function EmailMagico() {
  console.log('[EmailMagico] Component rendering');
  
  const [modalOpen, setModalOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [htmlGenerated, setHtmlGenerated] = useState(false);
  const [streamingHtml, setStreamingHtml] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Log mount
  useEffect(() => {
    console.log('[EmailMagico] Component mounted, modalOpen:', modalOpen);
    return () => console.log('[EmailMagico] Component unmounting');
  }, []);

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
      console.log('[EmailMagico] Initializing GrapesJS editor');
      try {
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
        console.log('[EmailMagico] GrapesJS initialized successfully');
        setEditorError(null);
      } catch (err) {
        console.error('[EmailMagico] Error initializing GrapesJS:', err);
        setEditorError(err instanceof Error ? err.message : 'Erro ao inicializar editor');
      }
    }

    return () => {
      if (editorRef.current) {
        console.log('[EmailMagico] Destroying GrapesJS editor');
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
    setStreamingHtml('');
    setModalOpen(false);

    try {
      console.log('[EmailMagico] Starting streaming request...');
      
      // Use streaming endpoint
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-email-magic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prompt: prompt.trim(), stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('[EmailMagico] Response content-type:', contentType);

      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedHtml = '';

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[EmailMagico] Stream completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                console.log('[EmailMagico] Received [DONE] signal');
                continue;
              }

              accumulatedHtml += data;
              setStreamingHtml(accumulatedHtml);
            }
          }
        }

        // Clean up the HTML
        let finalHtml = accumulatedHtml
          .replace(/^```html?\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();

        console.log('[EmailMagico] Final HTML length:', finalHtml.length);
        
        // Show editor and load HTML
        setHtmlGenerated(true);
        setLoading(false);

        // Wait for editor to initialize then load HTML
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.setComponents(finalHtml);
            editorRef.current.setStyle('');
          }
        }, 500);

        toast({
          title: 'Email gerado!',
          description: 'O HTML foi carregado no editor. Você pode continuar editando.',
        });

      } else {
        // Handle non-streaming response (JSON)
        const data = await response.json();
        
        if (!data.html) {
          throw new Error('Nenhum HTML foi gerado');
        }

        setHtmlGenerated(true);
        setLoading(false);

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
      }

    } catch (error: any) {
      console.error('[EmailMagico] Generation error:', error);
      setModalOpen(true);
      toast({
        title: 'Erro ao gerar email',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!editorRef.current) return;

    const html = editorRef.current.getHtml();
    const css = editorRef.current.getCss();

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
    setStreamingHtml('');
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

      {/* Editor/Preview Area */}
      <div className="flex-1 relative">
        {loading ? (
          // Show streaming preview while loading
          <div className="h-full flex flex-col">
            <div className="bg-muted/50 p-4 text-center border-b">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">{loadingMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tempo decorrido: {elapsedTime}s
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-background">
              {streamingHtml ? (
                <div 
                  className="max-w-3xl mx-auto border rounded-lg p-4 bg-card"
                  dangerouslySetInnerHTML={{ __html: streamingHtml }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Aguardando resposta da IA...</p>
                </div>
              )}
            </div>
          </div>
        ) : editorError ? (
          <div className="h-full flex items-center justify-center bg-destructive/10">
            <div className="text-center text-destructive">
              <p className="font-medium">Erro ao inicializar editor</p>
              <p className="text-sm mt-2">{editorError}</p>
            </div>
          </div>
        ) : htmlGenerated ? (
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
      <Dialog open={modalOpen && !loading} onOpenChange={setModalOpen}>
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
