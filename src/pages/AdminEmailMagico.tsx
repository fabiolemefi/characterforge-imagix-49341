import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEmailMagicConfig } from '@/hooks/useEmailMagicConfig';
import { Plus, Trash2, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminEmailMagico() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config, isLoading, updateConfig, uploadImage, deleteImage } = useEmailMagicConfig();
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [systemInstruction, setSystemInstruction] = useState('');
  const [topP, setTopP] = useState('0.95');
  const [temperature, setTemperature] = useState('1.5');
  const [thinkingLevel, setThinkingLevel] = useState('high');
  const [maxOutputTokens, setMaxOutputTokens] = useState('65535');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (config) {
      setSystemInstruction(config.system_instruction || '');
      setTopP(String(config.top_p || 0.95));
      setTemperature(String(config.temperature || 1.5));
      setThinkingLevel(config.thinking_level || 'high');
      setMaxOutputTokens(String(config.max_output_tokens || 65535));
      setReferenceImages(config.reference_images || []);
    }
  }, [config]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (error || !data) {
      navigate('/');
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta área',
        variant: 'destructive',
      });
      return;
    }

    setIsAdmin(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig.mutateAsync({
        system_instruction: systemInstruction,
        top_p: parseFloat(topP),
        temperature: parseFloat(temperature),
        thinking_level: thinkingLevel,
        max_output_tokens: parseInt(maxOutputTokens),
        reference_images: referenceImages,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const url = await uploadImage(file);
      if (url) {
        newImages.push(url);
      }
    }

    setReferenceImages(prev => [...prev, ...newImages]);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = referenceImages[index];
    await deleteImage(imageUrl);
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Email Mágico - Configurações</h1>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </header>

          <main className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Reference Images */}
                <Card>
                  <CardHeader>
                    <CardTitle>Imagens de Referência</CardTitle>
                    <CardDescription>
                      Imagens que serão enviadas ao modelo como referência visual para gerar os emails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                      {referenceImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      
                      <label className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                        {uploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Plus className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                          </>
                        )}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {referenceImages.length} imagem(s) de referência configurada(s)
                    </p>
                  </CardContent>
                </Card>

                {/* System Instruction */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Instruction</CardTitle>
                    <CardDescription>
                      Prompt de sistema que define como o modelo deve se comportar ao gerar os emails.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      placeholder="Insira o prompt de sistema..."
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </CardContent>
                </Card>

                {/* Model Parameters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Parâmetros do Modelo</CardTitle>
                    <CardDescription>
                      Configurações de geração do modelo Gemini 3 Pro.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="top_p">Top P</Label>
                        <Input
                          id="top_p"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={topP}
                          onChange={(e) => setTopP(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={temperature}
                          onChange={(e) => setTemperature(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="thinking_level">Thinking Level</Label>
                        <Select value={thinkingLevel} onValueChange={setThinkingLevel}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="max_output_tokens">Max Output Tokens</Label>
                        <Input
                          id="max_output_tokens"
                          type="number"
                          min="1000"
                          max="100000"
                          value={maxOutputTokens}
                          onChange={(e) => setMaxOutputTokens(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
