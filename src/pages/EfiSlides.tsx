import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSlideGenerations, SlideGeneration } from '@/hooks/useSlideGenerations';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Presentation, Loader2, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

export default function EfiSlides() {
  const [inputText, setInputText] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'pptx' | 'docx'>('text');
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { generations, isLoading, createGeneration } = useSlideGenerations();
  const { toast } = useToast();

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const docXml = await content.file('word/document.xml')?.async('string');
    
    if (!docXml) {
      throw new Error('Could not read document content');
    }

    // Extract text from XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, 'text/xml');
    const textNodes = xmlDoc.getElementsByTagName('w:t');
    
    let text = '';
    for (let i = 0; i < textNodes.length; i++) {
      text += textNodes[i].textContent + ' ';
    }
    
    return text.trim();
  };

  const extractTextFromPptx = async (file: File): Promise<string> => {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    
    let fullText = '';
    const slideFiles = Object.keys(content.files).filter(
      name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
    );

    for (const slideFile of slideFiles.sort()) {
      const slideXml = await content.file(slideFile)?.async('string');
      if (slideXml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('a:t');
        
        for (let i = 0; i < textNodes.length; i++) {
          fullText += textNodes[i].textContent + ' ';
        }
        fullText += '\n\n';
      }
    }
    
    return fullText.trim();
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setOriginalFilename(file.name);

    try {
      let extractedText = '';
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'docx') {
        extractedText = await extractTextFromDocx(file);
        setSourceType('docx');
      } else if (extension === 'pptx') {
        extractedText = await extractTextFromPptx(file);
        setSourceType('pptx');
      } else {
        throw new Error('Formato não suportado. Use arquivos .docx ou .pptx');
      }

      setInputText(extractedText);
      toast({
        title: 'Texto extraído com sucesso',
        description: `${extractedText.length.toLocaleString()} caracteres extraídos de ${file.name}`,
      });
    } catch (error) {
      console.error('Error extracting text:', error);
      toast({
        title: 'Erro ao extrair texto',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'Texto obrigatório',
        description: 'Digite ou faça upload de um conteúdo para gerar a apresentação',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createGeneration.mutateAsync({
        inputText: inputText.trim(),
        sourceType,
        originalFilename: originalFilename || undefined,
      });

      toast({
        title: 'Geração iniciada',
        description: 'Sua apresentação está sendo gerada. Acompanhe o progresso abaixo.',
      });

      // Clear form
      setInputText('');
      setSourceType('text');
      setOriginalFilename(null);
    } catch (error) {
      console.error('Error generating slides:', error);
      toast({
        title: 'Erro ao gerar apresentação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Aguardando</Badge>;
      case 'processing':
        return <Badge variant="default">Processando</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="py-8 px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Presentation className="h-8 w-8 text-primary" />
            Efi Slides
          </h1>
                <p className="text-muted-foreground mt-2">
                  Transforme seu conteúdo em apresentações profissionais usando IA
                </p>
              </div>

              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Criar Nova Apresentação</CardTitle>
                  <CardDescription>
                    Faça upload de um arquivo .docx ou .pptx, ou digite seu conteúdo diretamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".docx,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isExtracting}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {isExtracting ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Extraindo texto...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Clique para fazer upload
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Suporta .docx e .pptx (máx. 400.000 caracteres)
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {originalFilename && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Arquivo: {originalFilename}</span>
                      <Badge variant="outline">{sourceType.toUpperCase()}</Badge>
                    </div>
                  )}

                  {/* Text Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Ou digite/cole seu conteúdo:
                    </label>
                    <Textarea
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        if (!originalFilename) setSourceType('text');
                      }}
                      placeholder="Cole ou digite o conteúdo que será transformado em apresentação..."
                      className="min-h-[200px] resize-y"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {inputText.length.toLocaleString()} / 400.000 caracteres
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={!inputText.trim() || createGeneration.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {createGeneration.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando apresentação...
                      </>
                    ) : (
                      <>
                        <Presentation className="h-4 w-4 mr-2" />
                        Gerar Apresentação
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* History Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Apresentações</CardTitle>
                  <CardDescription>
                    Suas apresentações geradas recentemente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : generations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Presentation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma apresentação gerada ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {generations.map((gen: SlideGeneration) => (
                        <div
                          key={gen.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            {getStatusIcon(gen.status)}
                            <div>
                              <div className="font-medium">
                                {gen.original_filename || 'Texto digitado'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(gen.created_at).toLocaleString('pt-BR')}
                                {' • '}
                                {gen.input_text.length.toLocaleString()} caracteres
                              </div>
                              {gen.error_message && (
                                <div className="text-sm text-destructive mt-1">
                                  {gen.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(gen.status)}
                            {gen.gamma_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(gen.gamma_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Abrir
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
  );
}
