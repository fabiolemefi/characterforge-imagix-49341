import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SEALS = [
  { id: 'selo1', src: '/selo1.png', name: 'Selo 1' },
  { id: 'selo2', src: '/selo2.png', name: 'Selo 2' },
  { id: 'selo3', src: '/selo3.png', name: 'Selo 3' },
  { id: 'selo4', src: '/selo4.png', name: 'Selo 4' },
];

const ACCESS_CODE = 'EFICIENCIA2024';
const FINAL_SIZE = 600;

export default function EfiSelo() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedSeal, setSelectedSeal] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applySealOverlay = async (baseImageUrl: string, sealId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = FINAL_SIZE;
    canvas.height = FINAL_SIZE;

    const baseImage = new Image();
    baseImage.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      baseImage.onload = () => resolve();
      baseImage.onerror = reject;
      baseImage.src = baseImageUrl;
    });

    ctx.drawImage(baseImage, 0, 0, FINAL_SIZE, FINAL_SIZE);

    const seal = SEALS.find(s => s.id === sealId);
    if (seal) {
      const sealImage = new Image();
      await new Promise<void>((resolve, reject) => {
        sealImage.onload = () => resolve();
        sealImage.onerror = reject;
        sealImage.src = seal.src;
      });
      ctx.drawImage(sealImage, 0, 0, FINAL_SIZE, FINAL_SIZE);
    }

    setFinalImageUrl(canvas.toDataURL('image/png'));
  };

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === ACCESS_CODE) {
      setIsAuthenticated(true);
    } else {
      toast({ title: 'Código inválido', variant: 'destructive' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setGeneratedImageUrl(null);
        setFinalImageUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setGeneratedImageUrl(null);
        setFinalImageUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedSeal) {
      toast({ title: 'Selecione uma foto e um selo', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setFinalImageUrl(null);

    try {
      const base64Data = uploadedImage.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('generate-selo-image', {
        body: { imageBase64: base64Data, sealType: selectedSeal },
      });

      if (error) throw error;

      const recordId = data?.recordId;
      if (!recordId) throw new Error('Record ID não recebido');

      pollingRef.current = setInterval(async () => {
        const { data: record } = await supabase
          .from('generated_images')
          .select('status, image_url')
          .eq('id', recordId)
          .single();

        if (record?.status === 'completed' && record?.image_url) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setGeneratedImageUrl(record.image_url);
          await applySealOverlay(record.image_url, selectedSeal);
          setIsGenerating(false);
        } else if (record?.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          toast({ title: 'Erro na geração', variant: 'destructive' });
          setIsGenerating(false);
        }
      }, 3000);
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: 'Erro ao gerar imagem', variant: 'destructive' });
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const url = finalImageUrl || generatedImageUrl;
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `efi-selo-${Date.now()}.png`;
    link.click();
  };

  const handleReset = () => {
    setUploadedImage(null);
    setSelectedSeal(null);
    setGeneratedImageUrl(null);
    setFinalImageUrl(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleAccessCodeSubmit} className="w-full max-w-xs space-y-4">
          <h1 className="text-xl font-medium text-center">Efi Selo</h1>
          <p className="text-sm text-muted-foreground text-center">Digite o código de acesso</p>
          <Input
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Código"
            className="text-center"
          />
          <Button type="submit" className="w-full">Acessar</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-medium">Efi Selo</h1>
          <p className="text-sm text-muted-foreground">Transforme sua foto em estilo Pixar</p>
        </div>

        {/* Upload */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {uploadedImage ? (
            <img src={uploadedImage} alt="Upload" className="max-h-40 mx-auto rounded" />
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arraste ou clique para enviar</p>
            </div>
          )}
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Selos */}
        <div className="grid grid-cols-4 gap-2">
          {SEALS.map((seal) => (
            <button
              key={seal.id}
              onClick={() => setSelectedSeal(seal.id)}
              className={`p-2 border rounded-lg transition-all ${
                selectedSeal === seal.id 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <img src={seal.src} alt={seal.name} className="w-full aspect-square object-contain" />
            </button>
          ))}
        </div>

        {/* Gerar */}
        <Button 
          onClick={handleGenerate} 
          disabled={!uploadedImage || !selectedSeal || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            'Gerar Imagem'
          )}
        </Button>

        {/* Resultado */}
        {finalImageUrl && (
          <div className="space-y-4">
            <div className="border rounded-lg p-2">
              <img src={finalImageUrl} alt="Resultado" className="w-full rounded" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Nova Imagem
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
