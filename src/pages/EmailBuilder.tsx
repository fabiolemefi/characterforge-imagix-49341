import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Save, Download, Loader, Palette, Cloud, Send, Copy, ChevronDown } from 'lucide-react';
import { EmailPreview } from '@/components/EmailPreview';
import { AddBlockModal } from '@/components/AddBlockModal';
import { useEmailBlocks, EmailBlock } from '@/hooks/useEmailBlocks';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const onlineEmail = location?.state?.onlineEmail;
  const isOnlineMode = !!onlineEmail;
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
  const [uploadingToMC, setUploadingToMC] = useState(false);

  useEffect(() => {
    // Se for modo online, carregar os dados do email do SFMC
    if (onlineEmail) {
      setTemplateName(`Cópia de ${onlineEmail.name}`);
      
      // Extrair HTML do email - pode estar em content ou em views.html.content
      const htmlContent = onlineEmail.content || 
        onlineEmail.views?.html?.content || 
        '';
      
      // Extrair subject e preheader se existirem
      if (onlineEmail.views?.subjectline?.content) {
        setSubject(onlineEmail.views.subjectline.content);
      }
      if (onlineEmail.views?.preheader?.content) {
        setPreviewText(onlineEmail.views.preheader.content);
      }
      
      if (htmlContent) {
        setSelectedBlocks([{
          id: 'imported-html',
          instanceId: `imported-${Date.now()}`,
          name: 'HTML Importado',
          html_template: htmlContent,
          customHtml: htmlContent,
          category: 'imported',
          description: null,
          thumbnail_url: null,
          ai_instructions: null,
          is_active: true,
          created_at: new Date().toISOString(),
        }]);
      }
      return;
    }

    // Caso contrário, carregar template normal
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
  }, [id, modelId, onlineEmail]);

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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const extractAndConvertImages = async (html: string): Promise<{ images: { blob: Blob; newName: string; customerKey: string }[]; updatedHtml: string }> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgElements = doc.querySelectorAll('img');
    const images: { blob: Blob; newName: string; customerKey: string }[] = [];
    const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();

    for (const img of Array.from(imgElements)) {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:') || src.includes('image.comunicacao.sejaefi.com.br')) continue;

      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpeg';
        const originalName = src.split('/').pop()?.split('?')[0] || `image-${Date.now()}`;
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}-${uniqueSuffix}.${extension === 'jpg' ? 'jpeg' : extension}`;
        
        // Gerar customerKey curto (máx 36 chars): img_[base36timestamp]_[suffix]
        const customerKey = `img_${Date.now().toString(36)}_${uniqueSuffix}`;

        images.push({ blob, newName, customerKey });

        const newUrl = `https://image.comunicacao.sejaefi.com.br/lib/fe4111737764047d751573/m/1/${newName}`;
        img.setAttribute('src', newUrl);
      } catch (error) {
        console.error('Erro ao processar imagem:', src, error);
      }
    }

    return { images, updatedHtml: doc.body.innerHTML };
  };

  // Envia requisição para a extensão Chrome SFMC Proxy
  const sendToExtension = (action: string, payload?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Extensão não respondeu. Verifique se a extensão EFI SFMC Proxy está instalada e configurada.'));
      }, 30000); // 30 segundos de timeout

      const handler = (event: MessageEvent) => {
        if (event.data?.target !== 'SFMC_PROXY_RESPONSE') return;
        if (event.data?.requestId !== requestId) return;

        clearTimeout(timeout);
        window.removeEventListener('message', handler);

        if (event.data.response?.success) {
          resolve(event.data.response);
        } else {
          reject(new Error(event.data.response?.error || 'Erro desconhecido'));
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({
        target: 'SFMC_PROXY',
        requestId,
        action,
        payload
      }, '*');
    });
  };

  // Verifica se a extensão está disponível
  const checkExtension = async (): Promise<boolean> => {
    try {
      const response = await sendToExtension('CHECK_EXTENSION');
      return response.configured === true;
    } catch {
      return false;
    }
  };

  const handleExportToMC = async () => {
    if (!templateName) {
      toast({
        title: 'Erro',
        description: 'O template precisa ter um nome para exportar',
        variant: 'destructive',
      });
      return;
    }

    setUploadingToMC(true);

    // Verifica se a extensão está instalada e configurada
    const extensionReady = await checkExtension();
    if (!extensionReady) {
      toast({
        title: 'Extensão não encontrada',
        description: 'Instale e configure a extensão EFI SFMC Proxy no Chrome para exportar para o Marketing Cloud.',
        variant: 'destructive',
      });
      setUploadingToMC(false);
      return;
    }

    toast({
      title: 'Iniciando envio',
      description: `Enviando "${templateName}" para o Marketing Cloud via extensão...`,
    });

    try {
      const htmlContent = generateHtmlContent();
      const { images, updatedHtml } = await extractAndConvertImages(htmlContent);

      // Upload de cada imagem via extensão
      console.log(`[SFMC] Iniciando upload de ${images.length} imagens via extensão...`);
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const base64 = await blobToBase64(img.blob);
        const extension = img.newName.split('.').pop()?.toLowerCase();
        let assetTypeId = 22; // jpeg
        if (extension === 'png') assetTypeId = 28;
        else if (extension === 'gif') assetTypeId = 23;

        const imagePayload = {
          assetType: { name: extension || 'jpeg', id: assetTypeId },
          name: img.newName,
          file: base64,
          category: { id: 93941 },
          customerKey: img.customerKey, // Usar customerKey curto (máx 36 chars)
          fileProperties: { fileName: img.newName, extension: extension || 'jpeg' },
        };

        console.log(`[SFMC] Enviando imagem ${i + 1}/${images.length}: ${img.newName}`);
        
        toast({
          title: 'Enviando imagens...',
          description: `Imagem ${i + 1} de ${images.length}: ${img.newName}`,
        });

        await sendToExtension('UPLOAD_ASSET', imagePayload);
        console.log(`[SFMC] Imagem ${img.newName} enviada com sucesso`);
      }

      // Upload do HTML via extensão
      console.log('[SFMC] Iniciando upload do HTML via extensão...');
      toast({
        title: 'Enviando HTML...',
        description: 'Finalizando envio do template...',
      });

      const htmlPayload = {
        assetType: { name: 'htmlemail', id: 208 },
        name: templateName,
        category: { id: 93810 },
        views: {
          html: { content: updatedHtml },
          subjectline: { content: subject || templateName },
          preheader: { content: previewText || '' },
        },
      };

      await sendToExtension('UPLOAD_ASSET', htmlPayload);

      console.log('[SFMC] HTML enviado com sucesso');
      toast({
        title: 'Sucesso!',
        description: `"${templateName}" enviado para o Marketing Cloud.`,
      });
    } catch (error: any) {
      console.error('[SFMC] Erro ao enviar para MC:', error);
      toast({
        title: 'Erro no envio',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingToMC(false);
    }
  };

  // Atualizar email existente no SFMC (modo online)
  const handleUpdateInSFMC = async () => {
    if (!onlineEmail?.id) {
      toast({
        title: 'Erro',
        description: 'ID do email não encontrado',
        variant: 'destructive',
      });
      return;
    }

    setUploadingToMC(true);

    // Verifica se a extensão está instalada e configurada
    const extensionReady = await checkExtension();
    if (!extensionReady) {
      toast({
        title: 'Extensão não encontrada',
        description: 'Instale e configure a extensão EFI SFMC Proxy no Chrome para salvar no Marketing Cloud.',
        variant: 'destructive',
      });
      setUploadingToMC(false);
      return;
    }

    toast({
      title: 'Atualizando email',
      description: 'Salvando alterações no Marketing Cloud...',
    });

    try {
      const htmlContent = generateHtmlContent();
      const { images, updatedHtml } = await extractAndConvertImages(htmlContent);

      // Upload de cada imagem via extensão
      console.log(`[SFMC] Iniciando upload de ${images.length} imagens via extensão...`);
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const base64 = await blobToBase64(img.blob);
        const extension = img.newName.split('.').pop()?.toLowerCase();
        let assetTypeId = 22; // jpeg
        if (extension === 'png') assetTypeId = 28;
        else if (extension === 'gif') assetTypeId = 23;

        const imagePayload = {
          assetType: { name: extension || 'jpeg', id: assetTypeId },
          name: img.newName,
          file: base64,
          category: { id: 93941 },
          customerKey: img.customerKey,
          fileProperties: { fileName: img.newName, extension: extension || 'jpeg' },
        };

        console.log(`[SFMC] Enviando imagem ${i + 1}/${images.length}: ${img.newName}`);
        
        toast({
          title: 'Enviando imagens...',
          description: `Imagem ${i + 1} de ${images.length}: ${img.newName}`,
        });

        await sendToExtension('UPLOAD_ASSET', imagePayload);
        console.log(`[SFMC] Imagem ${img.newName} enviada com sucesso`);
      }

      // Atualizar o email existente via PATCH
      console.log('[SFMC] Atualizando email existente via extensão...');
      toast({
        title: 'Salvando...',
        description: 'Atualizando conteúdo do email...',
      });

      const updatePayload = {
        views: {
          html: { content: updatedHtml },
          subjectline: { content: subject || templateName },
          preheader: { content: previewText || '' },
        },
      };

      await sendToExtension('UPDATE_ASSET', { 
        assetId: onlineEmail.id, 
        assetData: updatePayload 
      });

      console.log('[SFMC] Email atualizado com sucesso');
      toast({
        title: 'Sucesso!',
        description: 'Email atualizado no Marketing Cloud.',
      });
    } catch (error: any) {
      console.error('[SFMC] Erro ao atualizar no MC:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingToMC(false);
    }
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
            {isOnlineMode ? (
              // Modo online: dropdown com Salvar e Salvar cópia
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={uploadingToMC}>
                    {uploadingToMC ? (
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {uploadingToMC ? 'Enviando...' : 'Salvar'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleUpdateInSFMC} disabled={uploadingToMC}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportToMC} disabled={uploadingToMC}>
                    <Copy className="h-4 w-4 mr-2" />
                    Salvar cópia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Modo offline: botões padrão
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={uploadingToMC}>
                      {uploadingToMC ? (
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {uploadingToMC ? 'Enviando...' : 'Exportar'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportToMC} disabled={uploadingToMC}>
                      <Cloud className="h-4 w-4 mr-2" />
                      Exportar para MC
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              </>
            )}
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
