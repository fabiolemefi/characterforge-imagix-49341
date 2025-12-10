import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Copy, ClipboardPaste, Upload, X } from 'lucide-react';
import { CanvaBlock, CanvaBlockType, BLOCK_TYPES, useCanvaBlocks } from '@/hooks/useCanvaBlocks';
import { useToast } from '@/hooks/use-toast';

interface CanvaBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: CanvaBlock | null;
  onSuccess: () => void;
}

export function CanvaBlockModal({ open, onOpenChange, block, onSuccess }: CanvaBlockModalProps) {
  const { createBlock, updateBlock, uploadThumbnail } = useCanvaBlocks();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [blockType, setBlockType] = useState<CanvaBlockType>('conteudo');
  const [htmlContent, setHtmlContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      if (block) {
        setName(block.name);
        setBlockType(block.block_type as CanvaBlockType);
        setHtmlContent(block.html_content);
        setThumbnailUrl(block.thumbnail_url);
        setIsActive(block.is_active);
      } else {
        setName('');
        setBlockType('conteudo');
        setHtmlContent('');
        setThumbnailUrl(null);
        setIsActive(true);
      }
    }
  }, [open, block]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do bloco.',
      });
      return;
    }

    setSaving(true);
    try {
      if (block) {
        await updateBlock(block.id, {
          name,
          block_type: blockType,
          html_content: htmlContent,
          thumbnail_url: thumbnailUrl,
          is_active: isActive,
        });
      } else {
        await createBlock({
          name,
          block_type: blockType,
          html_content: htmlContent,
          thumbnail_url: thumbnailUrl,
          is_active: isActive,
        });
      }
      onSuccess();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadThumbnail(file);
    if (url) {
      setThumbnailUrl(url);
    }
    setUploading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(htmlContent);
    toast({
      title: 'Copiado!',
      description: 'Código copiado para a área de transferência.',
    });
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setHtmlContent(text);
    toast({
      title: 'Colado!',
      description: 'Código colado do clipboard.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{block ? 'Editar Bloco' : 'Criar Novo Bloco'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="flex items-start gap-4">
              <div 
                className="w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Enviando...' : 'Upload'}
                </Button>
                {thumbnailUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setThumbnailUrl(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Bloco</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Header Principal"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={blockType} onValueChange={(v) => setBlockType(v as CanvaBlockType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* HTML Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Código HTML</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handlePaste}>
                  <ClipboardPaste className="h-4 w-4 mr-1" />
                  Colar
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<div>...</div>"
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Ativo</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : block ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
