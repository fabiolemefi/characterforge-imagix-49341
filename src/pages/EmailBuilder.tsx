import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Save, Download, Loader, Palette } from 'lucide-react';
import { EmailPreview } from '@/components/EmailPreview';
import { AddBlockModal } from '@/components/AddBlockModal';
import { useEmailBlocks, EmailBlock } from '@/hooks/useEmailBlocks';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useToast } from '@/hooks/use-toast';

interface SelectedBlock extends EmailBlock {
  instanceId: string;
  customHtml?: string;
}

const EmailBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const modelId = location?.state?.modelId;
  const { blocks } = useEmailBlocks();
  const { updateTemplate, saveTemplate, loadTemplateById } = useEmailTemplates();
  
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      const templateId = id || modelId;
      if (!templateId) return;

      setLoadingTemplate(true);
      const template = await loadTemplateById(templateId);
      setLoadingTemplate(false);

      if (template) {
        setTemplateName(modelId ? `Cópia de ${template.name}` : template.name);
        setTemplateDescription(template.description || '');
        setSubject(template.subject || '');
        setPreviewText(template.preview_text || '');
        
        if (template.blocks_data && Array.isArray(template.blocks_data)) {
          const loadedBlocks = template.blocks_data.map((blockData: any) => ({
            ...blockData,
            instanceId: blockData.instanceId || `${blockData.id}-${Date.now()}-${Math.random()}`,
          }));
          setSelectedBlocks(loadedBlocks);
        }
      }
    };

    loadTemplate();
  }, [id, modelId]);

  const handleAddBlock = (block: EmailBlock) => {
    const newBlock: SelectedBlock = {
      ...block,
      instanceId: `${block.id}-${Date.now()}`,
    };
    setSelectedBlocks([...selectedBlocks, newBlock]);
    toast({
      title: 'Bloco adicionado',
      description: `${block.name} foi adicionado ao email`,
    });
  };

  const handleRemoveBlock = (instanceId: string) => {
    setSelectedBlocks(selectedBlocks.filter(b => b.instanceId !== instanceId));
  };

  const handleUpdateBlock = (instanceId: string, html: string) => {
    setSelectedBlocks(selectedBlocks.map(b =>
      b.instanceId === instanceId
        ? { ...b, customHtml: html }
        : b
    ));
  };

  const generateHtmlContent = () => {
    return selectedBlocks
      .map(block => block.customHtml || block.html_template)
      .join('\n');
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    const htmlContent = generateHtmlContent();

    await updateTemplate(id, {
      name: templateName,
      description: templateDescription,
      subject,
      preview_text: previewText,
      html_content: htmlContent,
      blocks_data: selectedBlocks,
    });

    setSaving(false);
  };

  const handleSaveAsModel = async () => {
    setSaving(true);
    const htmlContent = generateHtmlContent();
    const modelName = `Modelo - ${templateName || 'Sem nome'}`;

    const result = await saveTemplate({
      name: modelName,
      description: templateDescription,
      subject,
      preview_text: previewText,
      html_content: htmlContent,
      blocks_data: selectedBlocks,
      is_model: true,
    });

    if (result) {
      toast({
        title: 'Modelo salvo!',
        description: 'Seu modelo foi criado com sucesso.',
      });
      navigate('/email-templates');
    }

    setSaving(false);
  };

  const handleDownload = () => {
    const htmlContent = generateHtmlContent();
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || templateName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td>
        ${htmlContent}
      </td>
    </tr>
  </table>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || 'email-template'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download iniciado',
      description: 'Seu template HTML foi baixado com sucesso',
    });
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/email-templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{templateName || 'Email Builder'}</h1>
              <p className="text-sm text-muted-foreground">
                {subject || 'Crie emails profissionais com nosso editor visual'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Baixar HTML
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={saving}>
                  {saving ? (
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSave}>
                  Salvar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSaveAsModel}>
                  <Palette className="h-4 w-4 mr-2" />
                  Salvar como Modelo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <EmailPreview
          blocks={selectedBlocks.map(block => ({
            instanceId: block.instanceId,
            html: block.customHtml || block.html_template
          }))}
          onReorderBlocks={(newBlocks) => {
            const reorderedBlocks = newBlocks.map(nb =>
              selectedBlocks.find(sb => sb.instanceId === nb.instanceId)!
            );
            setSelectedBlocks(reorderedBlocks);
          }}
          onUpdateBlock={handleUpdateBlock}
          onDeleteBlock={handleRemoveBlock}
          onAddBlock={() => setShowAddBlockModal(true)}
          className="h-full"
        />
      </div>

      <AddBlockModal
        open={showAddBlockModal}
        onClose={() => setShowAddBlockModal(false)}
        blocks={blocks}
        onAddBlock={handleAddBlock}
      />
    </div>
  );
};

export default EmailBuilder;
