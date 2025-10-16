import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function AdminBrandGuidePage() {
  const { categorySlug, pageSlug } = useParams();
  const navigate = useNavigate();
  const { loadPageContent, addBlock, deleteBlock, updateBlock, uploadAsset } = useBrandGuide();
  const [pageData, setPageData] = useState<any>(null);
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (categorySlug) {
        setLoading(true);
        const data = await loadPageContent(categorySlug, pageSlug);
        if (data) {
          setPageData(data);
          setBlocks(data.blocks);
        }
        setLoading(false);
      }
    };
    loadContent();
  }, [categorySlug, pageSlug]);

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
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (blockType: 'single_column' | 'two_columns' | 'three_columns' | 'title_only' | 'text_only') => {
    const newBlock = await addBlock(
      pageData?.page?.id || null,
      pageData?.page ? null : pageData?.category?.id,
      blockType
    );
    if (newBlock) {
      setBlocks([...blocks, newBlock]);
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
                {pageData?.page?.name || pageData?.category?.name}
              </h1>
              <p className="text-muted-foreground">
                Edite o conteúdo desta página
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
