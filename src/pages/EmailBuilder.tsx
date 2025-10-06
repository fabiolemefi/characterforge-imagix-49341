import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Save, Download, Eye, Plus } from 'lucide-react';
import { EmailPreview } from '@/components/EmailPreview';
import { BlocksLibrary } from '@/components/BlocksLibrary';
import { EmailBlockItem } from '@/components/EmailBlockItem';
import { BlockEditor } from '@/components/BlockEditor';
import { useEmailBlocks, EmailBlock } from '@/hooks/useEmailBlocks';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useToast } from '@/hooks/use-toast';
import { Sidebar } from '@/components/Sidebar';
import Header from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';

interface SelectedBlock extends EmailBlock {
  instanceId: string;
  customHtml?: string;
}

const EmailBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { blocks, loading: blocksLoading } = useEmailBlocks();
  const { saveTemplate, updateTemplate } = useEmailTemplates();
  
  const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<SelectedBlock | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleEditBlock = (block: SelectedBlock) => {
    setEditingBlock(block);
  };

  const handleSaveBlockEdit = (newHtml: string) => {
    if (editingBlock) {
      setSelectedBlocks(selectedBlocks.map(b =>
        b.instanceId === editingBlock.instanceId
          ? { ...b, customHtml: newHtml }
          : b
      ));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedBlocks((items) => {
        const oldIndex = items.findIndex(item => item.instanceId === active.id);
        const newIndex = items.findIndex(item => item.instanceId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const generateHtmlContent = () => {
    return selectedBlocks
      .map(block => block.customHtml || block.html_template)
      .join('\n');
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, dê um nome ao seu template',
      });
      return;
    }

    if (selectedBlocks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Template vazio',
        description: 'Adicione pelo menos um bloco ao template',
      });
      return;
    }

    const htmlContent = generateHtmlContent();

    if (currentTemplateId) {
      await updateTemplate(currentTemplateId, {
        name: templateName,
        description: templateDescription,
        subject,
        preview_text: previewText,
        html_content: htmlContent,
      });
    } else {
      const newTemplate = await saveTemplate({
        name: templateName,
        description: templateDescription,
        subject,
        preview_text: previewText,
        html_content: htmlContent,
      });
      if (newTemplate) {
        setCurrentTemplateId(newTemplate.id);
      }
    }
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

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <PromoBar />
        <Header />
        
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="border-b p-4 bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Email Builder</h1>
                    <p className="text-sm text-muted-foreground">
                      Crie emails profissionais com nosso editor visual
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar HTML
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Template
                  </Button>
                </div>
              </div>
            </div>

            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={50} minSize={30}>
                <EmailPreview htmlContent={generateHtmlContent()} className="h-full" />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={25} minSize={20}>
                <div className="h-full flex flex-col border-l">
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-semibold mb-4">Configurações do Email</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="template-name">Nome do Template *</Label>
                        <Input
                          id="template-name"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Ex: Newsletter Mensal"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="subject">Assunto do Email</Label>
                        <Input
                          id="subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Ex: Novidades deste mês"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="preview-text">Texto de Preview</Label>
                        <Textarea
                          id="preview-text"
                          value={previewText}
                          onChange={(e) => setPreviewText(e.target.value)}
                          placeholder="Texto que aparece na caixa de entrada..."
                          className="mt-1 resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          placeholder="Descrição interna do template..."
                          className="mt-1 resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 border-t">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="font-semibold">Blocos no Email</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Arraste para reordenar
                      </p>
                    </div>
                    
                    <ScrollArea className="h-[calc(100vh-600px)]">
                      <div className="p-4">
                        {selectedBlocks.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum bloco adicionado</p>
                            <p className="text-xs">Clique nos blocos à direita</p>
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={selectedBlocks.map(b => b.instanceId)}
                              strategy={verticalListSortingStrategy}
                            >
                              {selectedBlocks.map((block) => (
                                <EmailBlockItem
                                  key={block.instanceId}
                                  id={block.instanceId}
                                  name={block.name}
                                  category={block.category}
                                  onRemove={() => handleRemoveBlock(block.instanceId)}
                                  onEdit={() => handleEditBlock(block)}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={25} minSize={20}>
                <div className="h-full border-l">
                  <BlocksLibrary
                    blocks={blocks}
                    onAddBlock={handleAddBlock}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>

      {editingBlock && (
        <BlockEditor
          open={true}
          onClose={() => setEditingBlock(null)}
          blockHtml={editingBlock.customHtml || editingBlock.html_template}
          blockName={editingBlock.name}
          onSave={handleSaveBlockEdit}
        />
      )}
    </div>
  );
};

export default EmailBuilder;
