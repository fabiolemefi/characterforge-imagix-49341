import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Wand2, Monitor, Smartphone } from 'lucide-react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsMjml from 'grapesjs-mjml';

export default function EmailMagico() {
  console.log('[EmailMagico] Component rendering');
  
  const [modalOpen, setModalOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mjmlGenerated, setMjmlGenerated] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [originalMjml, setOriginalMjml] = useState<string>('');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
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
      'Gerando estrutura MJML...',
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

  // Initialize GrapesJS with MJML plugin when MJML is generated
  useEffect(() => {
    if (mjmlGenerated && editorContainerRef.current && !editorRef.current) {
      console.log('[EmailMagico] Initializing GrapesJS with MJML plugin');
      try {
        editorRef.current = grapesjs.init({
          container: editorContainerRef.current,
          height: '100%',
          width: 'auto',
          fromElement: false,
          storageManager: false,
          plugins: [grapesjsMjml],
          pluginsOpts: {
            [grapesjsMjml as any]: {
              // Custom fonts available in the editor
              fonts: {
                'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
                'Red Hat Display': 'https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap',
              }
            },
          },
          deviceManager: {
            devices: [
              { name: 'Desktop', width: '' },
              { name: 'Mobile', width: '375px', widthMedia: '480px' },
            ]
          },
          // Custom styles for the editor panels
          styleManager: {
            sectors: []
          }
        });
        
        console.log('[EmailMagico] GrapesJS MJML initialized successfully');
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
  }, [mjmlGenerated]);

  // Handle device view toggle
  useEffect(() => {
    if (editorRef.current) {
      const deviceName = deviceView === 'desktop' ? 'Desktop' : 'Mobile';
      editorRef.current.setDevice(deviceName);
    }
  }, [deviceView]);

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

      if (!data.mjml) {
        throw new Error('Nenhum MJML foi gerado');
      }

      // Store original MJML
      setOriginalMjml(data.mjml);
      console.log('[EmailMagico] MJML recebido, tamanho:', data.mjml.length);

      // Close modal and show editor
      setModalOpen(false);
      setMjmlGenerated(true);

      // Wait for editor to initialize then load MJML
      setTimeout(() => {
        if (editorRef.current) {
          // Load MJML directly into GrapesJS MJML editor
          editorRef.current.setComponents(data.mjml);
          console.log('[EmailMagico] MJML carregado no editor');
        }
      }, 500);

      toast({
        title: 'Email gerado!',
        description: 'O MJML foi carregado no editor. Você pode editar visualmente.',
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

    try {
      // Use MJML plugin command to get compiled HTML
      const mjmlCode = editorRef.current.runCommand('mjml-get-code');
      
      if (!mjmlCode || !mjmlCode.html) {
        throw new Error('Não foi possível exportar o HTML');
      }

      const fullHtml = mjmlCode.html;
      console.log('[EmailMagico] HTML exportado via MJML, tamanho:', fullHtml.length);

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
    } catch (error: any) {
      console.error('[EmailMagico] Export error:', error);
      toast({
        title: 'Erro ao exportar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleNewEmail = () => {
    setPrompt('');
    setMjmlGenerated(false);
    setOriginalMjml('');
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
          {mjmlGenerated && (
            <div className="flex border rounded-md overflow-hidden mr-2">
              <Button 
                variant={deviceView === 'desktop' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setDeviceView('desktop')}
                className="rounded-none"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button 
                variant={deviceView === 'mobile' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setDeviceView('mobile')}
                className="rounded-none"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={handleNewEmail}>
            <Wand2 className="h-4 w-4 mr-2" />
            Novo Email
          </Button>
          {mjmlGenerated && (
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar HTML
            </Button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        {editorError ? (
          <div className="h-full flex items-center justify-center bg-destructive/10">
            <div className="text-center text-destructive">
              <p className="font-medium">Erro ao inicializar editor</p>
              <p className="text-sm mt-2">{editorError}</p>
            </div>
          </div>
        ) : mjmlGenerated ? (
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
