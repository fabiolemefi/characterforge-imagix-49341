import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SEALS = [
  { id: 'selo1', src: '/selo1.png', name: 'Selo 1' },
  { id: 'selo2', src: '/selo2.png', name: 'Selo 2' },
  { id: 'selo3', src: '/selo3.png', name: 'Selo 3' },
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
      
      // Apply seal with 95% opacity
      ctx.globalAlpha = 0.95;
      ctx.drawImage(sealImage, 0, 0, FINAL_SIZE, FINAL_SIZE);
      ctx.globalAlpha = 1.0;
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

  if (!isAuthenticated) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/cenario_bg.png)' }}
      >
        <form onSubmit={handleAccessCodeSubmit} className="w-full max-w-xs space-y-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl">
          <img src="/logo.svg" alt="Logo" className="h-10 mx-auto" />
          <p className="text-sm text-white/70 text-center">Digite o código de acesso</p>
          <Input
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Código"
            className="text-center bg-white/20 border-white/30 text-white placeholder:text-white/50"
          />
          <Button type="submit" className="w-full">Acessar</Button>
        </form>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/cenario_bg.png)' }}
    >
      <div className="w-full max-w-md space-y-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl">
        <div className="text-center">
          <img src="/logo.svg" alt="Logo" className="h-10 mx-auto mb-2" />
          <p className="text-sm text-white/70">Faça parte desse movimento!</p>
        </div>

        {!finalImageUrl ? (
          <>
            {/* Upload */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative border-2 border-dashed border-white/30 rounded-lg p-6 text-center cursor-pointer hover:border-white/50 transition-colors bg-white/5"
              onClick={() => !isGenerating && document.getElementById('file-input')?.click()}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Upload" className="max-h-40 mx-auto rounded" />
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-white/60" />
                  <p className="text-sm text-white/60">Arraste ou clique para enviar</p>
                </div>
              )}
              
              {/* Loader overlay */}
              {uploadedImage && isGenerating && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg gap-3">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                  <p className="text-sm text-white/80">Isso pode levar até 1 min, aguarde...</p>
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
            <div className="grid grid-cols-3 gap-2">
              {SEALS.map((seal) => (
                <button
                  key={seal.id}
                  onClick={() => setSelectedSeal(seal.id)}
                  disabled={isGenerating}
                  className={`p-2 border rounded-lg transition-all bg-white/10 ${
                    selectedSeal === seal.id 
                      ? 'border-white ring-2 ring-white/30' 
                      : 'border-white/20 hover:border-white/40'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          </>
        ) : (
          <>
            {/* Resultado final */}
            <div className="border border-white/20 rounded-lg p-2 bg-white/5">
              <img src={finalImageUrl} alt="Resultado" className="w-full rounded" />
            </div>
            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
