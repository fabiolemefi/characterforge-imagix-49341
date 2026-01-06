import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandGuidePageContent, BrandGuideBlock } from '@/hooks/useBrandGuidePageContent';
import { useBrandGuideCategories } from '@/hooks/useBrandGuideData';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { TitleOnlyBlock } from '@/components/brandguide/TitleOnlyBlock';
import { TextOnlyBlock } from '@/components/brandguide/TextOnlyBlock';
import { ImageBlock } from '@/components/brandguide/ImageBlock';
import { VideoBlock } from '@/components/brandguide/VideoBlock';
import { EmbedBlock } from '@/components/brandguide/EmbedBlock';
import { SeparatorBlock } from '@/components/brandguide/SeparatorBlock';

export default function BrandGuide() {
  const { categorySlug, pageSlug } = useParams();
  const navigate = useNavigate();
  
  // React Query com cache - dados chegam instantaneamente se já carregados
  const { data: pageData, isLoading } = useBrandGuidePageContent(categorySlug, pageSlug);
  const { data: categories = [] } = useBrandGuideCategories();

  // Redireciona para primeira categoria se não tiver slug
  useEffect(() => {
    if (categories.length > 0 && !categorySlug) {
      navigate(`/brand-guide/${categories[0].slug}`, { replace: true });
    }
  }, [categories, categorySlug, navigate]);

  const renderBlock = (block: BrandGuideBlock) => {
    const props = {
      blockId: block.id,
      content: block.content,
      isAdmin: false,
      onContentChange: () => {},
    };

    switch (block.block_type) {
      case 'single_column':
        return <SingleColumnBlock key={block.id} {...props} />;
      case 'two_columns':
        return <TwoColumnBlock key={block.id} {...props} />;
      case 'three_columns':
        return <ThreeColumnBlock key={block.id} {...props} />;
      case 'title_only':
        return <TitleOnlyBlock key={block.id} {...props} />;
      case 'text_only':
        return <TextOnlyBlock key={block.id} {...props} />;
      case 'image':
        return <ImageBlock key={block.id} {...props} />;
      case 'video':
        return <VideoBlock key={block.id} {...props} />;
      case 'embed':
        return <EmbedBlock key={block.id} {...props} />;
      case 'separator':
        return <SeparatorBlock key={block.id} {...props} />;
      default:
        return null;
    }
  };

  const blocks = pageData?.blocks || [];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-12 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
