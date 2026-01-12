import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Download, Loader2, Lock, CheckCircle, ImageIcon, RefreshCw } from 'lucide-react';
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedSeal, setSelectedSeal] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Apply seal overlay to generated image
  const applySealOverlay = async (generatedImageUrl: string, sealId: string): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = FINAL_SIZE;
    canvas.height = FINAL_SIZE;

    return new Promise<string>((resolve) => {
      const generatedImg = new Image();
      generatedImg.crossOrigin = 'anonymous';
      
      generatedImg.onload = () => {
        ctx.drawImage(generatedImg, 0, 0, FINAL_SIZE, FINAL_SIZE);
        
        const sealImg = new Image();
        sealImg.onload = () => {
          ctx.drawImage(sealImg, 0, 0, FINAL_SIZE, FINAL_SIZE);
          resolve(canvas.toDataURL('image/png'));
        };
        sealImg.onerror = () => resolve(canvas.toDataURL('image/png'));
        
        const seal = SEALS.find(s => s.id === sealId);
        sealImg.src = seal?.src || '/selo1.png';
      };
      
      generatedImg.onerror = () => resolve(generatedImageUrl);
      generatedImg.src = generatedImageUrl;
    });
  };

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.toUpperCase() === ACCESS_CODE) {
      setIsAuthenticated(true);
      toast.success('Acesso liberado!');
    } else {
      toast.error('Código de acesso inválido');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem');
        return;
      }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setGeneratedImage(null);
      setFinalImage(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setGeneratedImage(null);
      setFinalImage(null);
    } else {
      toast.error('Por favor, arraste uma imagem válida');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!uploadedFile || !selectedSeal) {
      toast.error('Selecione uma foto e um selo');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setFinalImage(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      const { data, error } = await supabase.functions.invoke('generate-selo-image', {
        body: { imageBase64: base64, sealType: selectedSeal },
      });

      if (error) throw error;

      if (data.recordId) {
        setRecordId(data.recordId);
        const currentSeal = selectedSeal;
        
        pollingRef.current = setInterval(async () => {
          const { data: record } = await supabase
            .from('generated_images')
            .select('*')
            .eq('id', data.recordId)
            .single();

          if (record?.status === 'completed' && record.image_url) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setGeneratedImage(record.image_url);
            const composite = await applySealOverlay(record.image_url, currentSeal);
            setFinalImage(composite || record.image_url);
            setIsGenerating(false);
            toast.success('Imagem gerada com sucesso!');
          } else if (record?.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);
            toast.error(record.error_message || 'Falha ao gerar imagem');
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Erro ao gerar imagem');
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const img = finalImage || generatedImage;
    if (!img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `efi-selo-${Date.now()}.png`;
    a.click();
    toast.success('Download iniciado!');
  };

  const handleReset = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setSelectedSeal(null);
    setGeneratedImage(null);
    setFinalImage(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">EfiSelo</h1>
              <p className="text-slate-400">Digite o código de acesso para continuar</p>
            </div>
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <Input type="password" placeholder="Código de acesso" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" />
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Acessar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">EfiSelo</h1>
          <p className="text-slate-400">Transforme sua foto em uma ilustração estilo Pixar com selo personalizado</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">1. Envie sua foto</h2>
                <div onDrop={handleDrop} onDragOver={handleDragOver} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${uploadedImage ? 'border-green-500 bg-green-500/10' : 'border-slate-600 hover:border-orange-500'}`}>
                  {uploadedImage ? (
                    <div className="space-y-4">
                      <img src={uploadedImage} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                      <div className="flex items-center justify-center gap-2 text-green-400"><CheckCircle className="w-5 h-5" /><span>Imagem carregada</span></div>
                      <Button variant="outline" size="sm" onClick={() => { setUploadedImage(null); setUploadedFile(null); }} className="text-slate-300 border-slate-600">Trocar imagem</Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300 mb-2">Arraste uma imagem ou clique para selecionar</p>
                      <p className="text-slate-500 text-sm">PNG, JPG até 10MB</p>
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">2. Escolha o selo</h2>
                <div className="grid grid-cols-2 gap-4">
                  {SEALS.map((seal) => (
                    <button key={seal.id} onClick={() => setSelectedSeal(seal.id)} className={`relative rounded-lg overflow-hidden border-2 transition-all ${selectedSeal === seal.id ? 'border-orange-500 ring-2 ring-orange-500/50' : 'border-slate-600 hover:border-slate-500'}`}>
                      <img src={seal.src} alt={seal.name} className="w-full aspect-square object-contain bg-slate-700/50 p-2" />
                      {selectedSeal === seal.id && <div className="absolute top-2 right-2 bg-orange-500 rounded-full p-1"><CheckCircle className="w-4 h-4 text-white" /></div>}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleGenerate} disabled={!uploadedImage || !selectedSeal || isGenerating} className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
              {isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando sua imagem...</> : <><ImageIcon className="w-5 h-5 mr-2" />Gerar Imagem</>}
            </Button>
          </div>

          <Card className="bg-slate-800/50 border-slate-700 h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-4">3. Resultado</h2>
              <div className="flex-1 flex items-center justify-center rounded-lg bg-slate-700/30 min-h-[400px]">
                {isGenerating ? (
                  <div className="text-center space-y-4">
                    <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto" />
                    <p className="text-white font-medium">Gerando sua imagem...</p>
                    <p className="text-slate-400 text-sm">Isso pode levar de 30 a 60 segundos</p>
                  </div>
                ) : (finalImage || generatedImage) ? (
                  <div className="w-full space-y-4">
                    <img src={finalImage || generatedImage || ''} alt="Resultado" className="w-full max-w-md mx-auto rounded-lg shadow-xl" />
                    <div className="flex gap-3 justify-center">
                      <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700"><Download className="w-4 h-4 mr-2" />Baixar Imagem</Button>
                      <Button onClick={handleReset} variant="outline" className="border-slate-600 text-slate-300"><RefreshCw className="w-4 h-4 mr-2" />Nova Imagem</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center"><ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400">Sua imagem aparecerá aqui</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
