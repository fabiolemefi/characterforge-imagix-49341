import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useBrandGuide, BrandGuideBlock } from '@/hooks/useBrandGuide';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { TitleOnlyBlock } from '@/components/brandguide/TitleOnlyBlock';
import { TextOnlyBlock } from '@/components/brandguide/TextOnlyBlock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function AdminBrandGuideHome() {
  const navigate = useNavigate();
  const { deleteBlock, updateBlock, uploadAsset } = useBrandGuide();
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHomeBlocks();
  }, []);

  const loadHomeBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_guide_blocks')
        .select('*')
        .is('page_id', null)
        .is('category_id', null)
        .order('position');

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error loading home blocks:', error);
      toast.error('Erro ao carregar blocos');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (blockId: string, content: any) => {
    setPendingChanges(prev => new Map(prev).set(blockId, content));
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    setSaving(true);
    try {
      for (const [blockId, content] of pendingChanges.entries()) {
        // Upload images if needed
        if (content.imageFile) {
          const url = await uploadAsset(content.imageFile, 'images');
          if (url) {
            content.media_url = url;
            delete content.imageFile;
          }
        }

        // Upload images in columns if needed
        if (content.columns) {
          for (const column of content.columns) {
            if (column.imageFile) {
              const url = await uploadAsset(column.imageFile, 'images');
              if (url) {
                column.image_url = url;
                delete column.imageFile;
              }
            }
          }
        }

        await updateBlock(blockId, content);
      }

      setPendingChanges(new Map());
      toast.success('Alterações salvas com sucesso!');
      await loadHomeBlocks();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (blockType: 'single_column' | 'two_columns' | 'three_columns' | 'title_only' | 'text_only') => {
    try {
      const { data: existingBlocks } = await supabase
        .from('brand_guide_blocks')
        .select('position')
        .is('page_id', null)
        .is('category_id', null)
        .order('position', { ascending: false })
        .limit(1);

      const newPosition = existingBlocks && existingBlocks.length > 0 ? existingBlocks[0].position + 1 : 0;

      const defaultContent = blockType === 'single_column' 
        ? { title: '', subtitle: '', media_type: 'image', media_url: '', media_alt: '' }
        : blockType === 'two_columns'
        ? { columns: [
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' }
          ]}
        : blockType === 'three_columns'
        ? { columns: [
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' }
          ]}
        : blockType === 'title_only'
        ? { title: '' }
        : { text: '' };

      const { data, error } = await supabase
        .from('brand_guide_blocks')
        .insert({
          page_id: null,
          category_id: null,
          block_type: blockType,
          position: newPosition,
          content: defaultContent,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Bloco adicionado com sucesso');
      setBlocks([...blocks, data]);
    } catch (error) {
      console.error('Error adding block:', error);
      toast.error('Erro ao adicionar bloco');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const success = await deleteBlock(blockId);
    if (success) {
      setBlocks(blocks.filter(b => b.id !== blockId));
    }
  };

  const renderBlock = (block: BrandGuideBlock) => {
    const blockWrapper = (content: React.ReactNode) => (
      <div key={block.id} className="relative group">
        {content}
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleDeleteBlock(block.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );

    switch (block.block_type) {
      case 'single_column':
        return blockWrapper(
          <SingleColumnBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'two_columns':
        return blockWrapper(
          <TwoColumnBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'three_columns':
        return blockWrapper(
          <ThreeColumnBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'title_only':
        return blockWrapper(
          <TitleOnlyBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'text_only':
        return blockWrapper(
          <TextOnlyBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div>Carregando...</div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/admin/brand-guide')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold">
                Home do Guia de Marca
              </h1>
              <p className="text-muted-foreground">
                Edite o conteúdo da página inicial do guia de marca
              </p>
            </div>
            <Button 
              onClick={handleSaveChanges} 
              disabled={saving || pendingChanges.size === 0}
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : `Salvar${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
            </Button>
          </div>

          <div className="space-y-8 mb-8">
            {blocks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Nenhum bloco adicionado ainda. Clique em "Adicionar Bloco" para começar.
                </p>
              </div>
            ) : (
              blocks.map(renderBlock)
            )}
          </div>

          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Bloco
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAddBlock('title_only')}>
                  Título
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock('text_only')}>
                  Texto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock('single_column')}>
                  Título + Subtítulo + Imagem
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock('two_columns')}>
                  2 Colunas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock('three_columns')}>
                  3 Colunas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
