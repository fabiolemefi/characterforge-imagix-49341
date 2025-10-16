import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import Header from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';
import { useBrandGuide, BrandGuideBlock } from '@/hooks/useBrandGuide';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';

export default function BrandGuide() {
  const { categorySlug, pageSlug } = useParams();
  const navigate = useNavigate();
  const { categories, loading, loadPageContent } = useBrandGuide();
  const [pageData, setPageData] = useState<any>(null);
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);

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

  const renderBlock = (block: BrandGuideBlock) => {
    switch (block.block_type) {
      case 'single_column':
        return (
          <div key={block.id}>
            <SingleColumnBlock blockId={block.id} content={block.content} isAdmin={false} />
          </div>
        );
      case 'two_columns':
        return (
          <div key={block.id}>
            <TwoColumnBlock blockId={block.id} content={block.content} isAdmin={false} />
          </div>
        );
      case 'three_columns':
        return (
          <div key={block.id}>
            <ThreeColumnBlock blockId={block.id} content={block.content} isAdmin={false} />
          </div>
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

            {blocks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum conteúdo disponível ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {blocks.map(renderBlock)}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
