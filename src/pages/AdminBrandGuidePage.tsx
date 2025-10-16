import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useBrandGuide, BrandGuideBlock } from '@/hooks/useBrandGuide';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminBrandGuidePage() {
  const { categorySlug, pageSlug } = useParams();
  const navigate = useNavigate();
  const { loadPageContent, addBlock, deleteBlock } = useBrandGuide();
  const [pageData, setPageData] = useState<any>(null);
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleAddBlock = async (blockType: 'single_column' | 'two_columns' | 'three_columns') => {
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
          <SingleColumnBlock blockId={block.id} content={block.content} isAdmin={true} />
        );
      case 'two_columns':
        return blockWrapper(
          <TwoColumnBlock blockId={block.id} content={block.content} isAdmin={true} />
        );
      case 'three_columns':
        return blockWrapper(
          <ThreeColumnBlock blockId={block.id} content={block.content} isAdmin={true} />
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
          <div className="mb-8">
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
                <DropdownMenuItem onClick={() => handleAddBlock('single_column')}>
                  1 Coluna (Imagem/Vídeo)
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
