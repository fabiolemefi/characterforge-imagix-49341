import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import Header from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';
import { useBrandGuide, BrandGuideBlock } from '@/hooks/useBrandGuide';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BrandGuide() {
  const { categorySlug, pageSlug } = useParams();
  const navigate = useNavigate();
  const { categories, loading, loadPageContent, addBlock, deleteBlock } = useBrandGuide();
  const [pageData, setPageData] = useState<any>(null);
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(data || false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading && categories.length > 0 && !categorySlug) {
      navigate(`/brand-guide/${categories[0].slug}`);
    }
  }, [loading, categories, categorySlug, navigate]);

  useEffect(() => {
    const loadContent = async () => {
      if (categorySlug) {
        const data = await loadPageContent(categorySlug, pageSlug);
        if (data) {
          setPageData(data);
          setBlocks(data.blocks);
        }
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
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleDeleteBlock(block.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );

    switch (block.block_type) {
      case 'single_column':
        return blockWrapper(
          <SingleColumnBlock blockId={block.id} content={block.content} isAdmin={isAdmin} />
        );
      case 'two_columns':
        return blockWrapper(
          <TwoColumnBlock blockId={block.id} content={block.content} isAdmin={isAdmin} />
        );
      case 'three_columns':
        return blockWrapper(
          <ThreeColumnBlock blockId={block.id} content={block.content} isAdmin={isAdmin} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <PromoBar />
        <Header />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">
                {pageData?.page?.name || pageData?.category?.name}
              </h1>
            </div>

            <div className="space-y-8">
              {blocks.map(renderBlock)}
            </div>

            {isAdmin && (
              <div className="mt-8 flex justify-center">
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
