import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSlideGenerations, SlideGeneration, UploadedImage } from '@/hooks/useSlideGenerations';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Presentation, Loader2, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, Image, X, Copy, Plus } from 'lucide-react';
import JSZip from 'jszip';

export default function EfiSlides() {
  const [inputText, setInputText] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'pptx' | 'docx'>('text');
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { generations, isLoading, createGeneration, uploadImage, deleteImage } = useSlideGenerations();
  const { toast } = useToast();

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const docXml = await content.file('word/document.xml')?.async('string');
    
    if (!docXml) {
      throw new Error('Could not read document content');
    }

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

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Arquivo inválido',
            description: `${file.name} não é uma imagem`,
            variant: 'destructive',
          });
          continue;
        }

        const { url } = await uploadImage(file);
        const newTag = `img${uploadedImages.length + 1}`;
        
        setUploadedImages(prev => [...prev, {
          id: `${Date.now()}-${file.name}`,
          file,
          url,
          tag: newTag,
        }]);
      }

      toast({
        title: 'Imagens enviadas',
        description: 'Use as tags no texto para incluir as imagens na apresentação',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro ao enviar imagem',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      // Reset input
      event.target.value = '';
    }
  }, [uploadImage, uploadedImages.length, toast]);

  const handleRemoveImage = useCallback(async (imageId: string) => {
    const image = uploadedImages.find(img => img.id === imageId);
    if (!image) return;

    try {
      // Extract path from URL
      const urlParts = image.url.split('/slides-images/');
      if (urlParts[1]) {
        await deleteImage(urlParts[1]);
      }
      
      setUploadedImages(prev => {
        const filtered = prev.filter(img => img.id !== imageId);
        // Renumber tags
        return filtered.map((img, index) => ({
          ...img,
          tag: `img${index + 1}`,
        }));
      });
    } catch (error) {
      console.error('Error removing image:', error);
    }
  }, [uploadedImages, deleteImage]);

  const copyTag = useCallback((tag: string) => {
    navigator.clipboard.writeText(`[${tag}]`);
    toast({
      title: 'Tag copiada',
      description: `Use [${tag}] no seu texto para incluir esta imagem`,
    });
  }, [toast]);

  const insertTag = useCallback((tag: string) => {
    setInputText(prev => prev + `[${tag}]`);
    toast({
      title: 'Tag inserida',
      description: `[${tag}] foi adicionada ao final do texto`,
    });
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

    // Build images map
    const imagesMap: Record<string, string> = {};
    uploadedImages.forEach(img => {
      imagesMap[img.tag] = img.url;
    });

    try {
      await createGeneration.mutateAsync({
        inputText: inputText.trim(),
        sourceType,
        originalFilename: originalFilename || undefined,
        imagesMap: Object.keys(imagesMap).length > 0 ? imagesMap : undefined,
      });

      toast({
        title: 'Geração iniciada',
        description: 'Sua apresentação está sendo gerada. Acompanhe o progresso abaixo.',
      });

      // Clear form
      setInputText('');
      setSourceType('text');
      setOriginalFilename(null);
      setUploadedImages([]);
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

            {/* Image Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Imagens para a apresentação
                </label>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploadingImage}
                  />
                  <label htmlFor="image-upload">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      asChild
                      disabled={isUploadingImage}
                    >
                      <span>
                        {isUploadingImage ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Adicionar imagem
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {uploadedImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative group border rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={image.url}
                        alt={image.file.name}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyTag(image.tag)}
                          title="Copiar tag"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => insertTag(image.tag)}
                          title="Inserir no texto"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveImage(image.id)}
                          title="Remover"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 px-2 py-1">
                        <code className="text-xs font-mono text-primary">[{image.tag}]</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploadedImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Use as tags como <code className="bg-muted px-1 rounded">[img1]</code> no seu texto para incluir as imagens na apresentação.
                </p>
              )}
            </div>

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
                placeholder="Cole ou digite o conteúdo que será transformado em apresentação. Use [img1], [img2] etc. para incluir imagens..."
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
                          {gen.images_data && Object.keys(gen.images_data).length > 0 && (
                            <>
                              {' • '}
                              <span className="inline-flex items-center gap-1">
                                <Image className="h-3 w-3" />
                                {Object.keys(gen.images_data).length}
                              </span>
                            </>
                          )}
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