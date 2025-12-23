import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EfiLink, EfiLinkInsert, generateFullUrl } from "@/hooks/useEfiLinks";
import { sendToExtension, checkExtensionInstalled } from "@/lib/extensionProxy";

interface EfiLinkFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link?: EfiLink | null;
  onSave: (data: Omit<EfiLinkInsert, 'user_id'>) => void;
  isSaving: boolean;
}

export function EfiLinkFormModal({
  open,
  onOpenChange,
  link,
  onSave,
  isSaving,
}: EfiLinkFormModalProps) {
  const isEditing = !!link;
  
  const [formData, setFormData] = useState<Partial<EfiLink>>({
    link_pattern: 'onelink',
    url_destino: '',
    deeplink: '',
    deeplink_param: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    name: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      checkExtensionInstalled().then(setExtensionAvailable);
      
      if (link) {
        setFormData({
          link_pattern: link.link_pattern,
          url_destino: link.url_destino,
          deeplink: link.deeplink || '',
          deeplink_param: link.deeplink_param || '',
          utm_source: link.utm_source || '',
          utm_medium: link.utm_medium || '',
          utm_campaign: link.utm_campaign || '',
          utm_content: link.utm_content || '',
          utm_term: link.utm_term || '',
          name: link.name || '',
          original_url: link.original_url,
          shortened_url: link.shortened_url,
        });
      } else {
        setFormData({
          link_pattern: 'onelink',
          url_destino: '',
          deeplink: '',
          deeplink_param: '',
          utm_source: '',
          utm_medium: '',
          utm_campaign: '',
          utm_content: '',
          utm_term: '',
          name: '',
        });
      }
    }
  }, [open, link]);

  // Espelhar UTM para AppsFlyer automaticamente
  const handleUtmChange = (field: string, value: string) => {
    const updates: Partial<EfiLink> = { [field]: value };
    
    // Mapeamento UTM -> AppsFlyer
    if (field === 'utm_source') updates.pid = value;
    if (field === 'utm_medium') updates.af_channel = value;
    if (field === 'utm_campaign') updates.c = value;
    if (field === 'utm_content') updates.af_adset = value;
    if (field === 'utm_term') updates.af_ad = value;
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    if (!formData.url_destino) {
      toast.error("Preencha a URL de destino");
      return;
    }

    if (!extensionAvailable) {
      toast.error("Extensão não detectada. Instale a extensão EFI SFMC Proxy para criar links.");
      return;
    }

    setIsProcessing(true);

    try {
      // Gerar URL completa
      const fullUrl = generateFullUrl({
        ...formData,
        pid: formData.utm_source,
        af_channel: formData.utm_medium,
        c: formData.utm_campaign,
        af_adset: formData.utm_content,
        af_ad: formData.utm_term,
      });

      // Encurtar URL via extensão
      const response = await sendToExtension('SHORTEN_URL', { url: fullUrl });

      if (!response.success || !response.shorted_url) {
        toast.error(response.error || "Erro ao encurtar URL. Verifique sua conexão e tente novamente.");
        setIsProcessing(false);
        return;
      }

      // Salvar com URL encurtada
      const saveData: Omit<EfiLinkInsert, 'user_id'> = {
        link_pattern: formData.link_pattern as 'onelink' | 'sejaefi',
        url_destino: formData.url_destino,
        deeplink: formData.deeplink || undefined,
        deeplink_param: formData.deeplink_param || undefined,
        utm_source: formData.utm_source || undefined,
        utm_medium: formData.utm_medium || undefined,
        utm_campaign: formData.utm_campaign || undefined,
        utm_content: formData.utm_content || undefined,
        utm_term: formData.utm_term || undefined,
        pid: formData.utm_source || undefined,
        af_channel: formData.utm_medium || undefined,
        c: formData.utm_campaign || undefined,
        af_adset: formData.utm_content || undefined,
        af_ad: formData.utm_term || undefined,
        original_url: fullUrl,
        shortened_url: response.shorted_url,
        shortened_code: response.shorted || undefined,
        name: formData.name || undefined,
      };

      onSave(saveData);
    } catch (error) {
      console.error("Erro ao processar link:", error);
      toast.error("Erro ao processar link");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Link' : 'Novo Link'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Nome do link */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              placeholder="Ex: Campanha Black Friday"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Padrão do link */}
          <div className="space-y-2">
            <Label>Padrão do Link</Label>
            <RadioGroup
              value={formData.link_pattern}
              onValueChange={(value) => setFormData(prev => ({ ...prev, link_pattern: value as 'onelink' | 'sejaefi' }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="onelink" id="onelink" />
                <Label htmlFor="onelink" className="cursor-pointer">Sem Deeplink</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sejaefi" id="sejaefi" />
                <Label htmlFor="sejaefi" className="cursor-pointer">Com Deeplink</Label>
              </div>
            </RadioGroup>
          </div>

          {/* URL de destino */}
          <div className="space-y-2">
            <Label htmlFor="url_destino">
              {formData.link_pattern === 'sejaefi' ? 'URL de destino no Desktop' : 'URL destino'}
            </Label>
            <Input
              id="url_destino"
              type="url"
              placeholder="https://sejaefi.com.br/parceiro/sised"
              value={formData.url_destino || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, url_destino: e.target.value }))}
            />
          </div>

          {/* Campos de Deeplink (apenas para sejaefi) */}
          {formData.link_pattern === 'sejaefi' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="deeplink">Deeplink</Label>
                <Input
                  id="deeplink"
                  type="url"
                  placeholder="Deep link do app, se aplicável"
                  value={formData.deeplink || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, deeplink: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deeplink_param">Parâmetro (product_id)</Label>
                <Input
                  id="deeplink_param"
                  placeholder="Ex: 18307"
                  value={formData.deeplink_param || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, deeplink_param: e.target.value }))}
                />
              </div>
            </>
          )}

          {/* Parâmetros UTM */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm text-muted-foreground">Dados Rastreáveis</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="utm_source">Fonte</Label>
                <Input
                  id="utm_source"
                  placeholder="Ex: google"
                  value={formData.utm_source || ''}
                  onChange={(e) => handleUtmChange('utm_source', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_medium">Canal</Label>
                <Input
                  id="utm_medium"
                  placeholder="Ex: email"
                  value={formData.utm_medium || ''}
                  onChange={(e) => handleUtmChange('utm_medium', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_campaign">Campanha</Label>
                <Input
                  id="utm_campaign"
                  placeholder="Ex: black-friday"
                  value={formData.utm_campaign || ''}
                  onChange={(e) => handleUtmChange('utm_campaign', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="utm_content">Conteúdo</Label>
                <Input
                  id="utm_content"
                  placeholder="Ex: banner-hero"
                  value={formData.utm_content || ''}
                  onChange={(e) => handleUtmChange('utm_content', e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="utm_term">Termo</Label>
                <Input
                  id="utm_term"
                  placeholder="Ex: conta-digital"
                  value={formData.utm_term || ''}
                  onChange={(e) => handleUtmChange('utm_term', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mostrar URL original na edição */}
          {isEditing && formData.original_url && (
            <div className="p-3 bg-muted/50 border border-border rounded-lg text-sm break-all">
              <p className="text-xs text-muted-foreground mb-1">URL Original (não encurtada):</p>
              <span className="text-foreground/80">{formData.original_url}</span>
            </div>
          )}

          {/* URL encurtada na edição */}
          {isEditing && formData.shortened_url && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm break-all">
              <p className="text-xs text-muted-foreground mb-1">URL Encurtada:</p>
              <a href={formData.shortened_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                {formData.shortened_url}
              </a>
            </div>
          )}

          {extensionAvailable === false && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
              <p className="text-yellow-600">
                Extensão não detectada. Instale a extensão EFI SFMC Proxy para criar links.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isProcessing || !extensionAvailable}>
            {(isSaving || isProcessing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isProcessing ? 'Encurtando...' : isEditing ? 'Salvar' : 'Criar Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}