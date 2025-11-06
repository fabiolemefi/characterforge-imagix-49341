import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { TitleOnlyBlock } from '@/components/brandguide/TitleOnlyBlock';
import { TextOnlyBlock } from '@/components/brandguide/TextOnlyBlock';
import { BrandGuideBlock } from '@/hooks/useBrandGuide';
import { safeSupabaseQuery } from '@/lib/safeSupabaseQuery';
import { ErrorFallback } from '@/components/ErrorFallback';

export default function BrandGuideHome() {
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHomeBlocks();
  }, []);

  const loadHomeBlocks = async () => {
    setLoading(true);
    setError(null);

    const result = await safeSupabaseQuery<BrandGuideBlock[]>(
      async () => {
        const { data, error } = await supabase
          .from('brand_guide_blocks')
          .select('*')
          .is('page_id', null)
          .is('category_id', null)
          .order('position');
        return { data, error };
      },
      {
        timeout: 15000,
        maxRetries: 3,
        operationName: 'Load Brand Guide Home Blocks'
      }
    );

    if (result.success && result.data) {
      setBlocks(result.data);
      setError(null);
    } else {
      console.error('BrandGuideHome: Failed to load blocks:', result.error);
      setError(result.error?.message || 'Erro ao carregar blocos do guia de marca');
    }

    setLoading(false);
  };

  const renderBlock = (block: BrandGuideBlock) => {
    switch (block.block_type) {
      case 'single_column':
        return (
          <div key={block.id}>
            <SingleColumnBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      case 'two_columns':
        return (
          <div key={block.id}>
            <TwoColumnBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      case 'three_columns':
        return (
          <div key={block.id}>
            <ThreeColumnBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      case 'title_only':
        return (
          <div key={block.id}>
            <TitleOnlyBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      case 'text_only':
        return (
          <div key={block.id}>
            <TextOnlyBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-12 bg-muted rounded w-1/3"></div>
                <div className="h-64 bg-muted rounded"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            ) : error ? (
              <>
                <div className="mb-8">
                  <h1 className="text-4xl font-bold mb-2">
                    Guia de Marca
                  </h1>
                </div>
                <ErrorFallback
                  title="Erro ao carregar conteúdo"
                  message={error}
                  onRetry={loadHomeBlocks}
                />
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-4xl font-bold mb-2">
                    Guia de Marca
                  </h1>
                  <p className="text-muted-foreground">
                    Bem-vindo ao guia de marca da Efi
                  </p>
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
