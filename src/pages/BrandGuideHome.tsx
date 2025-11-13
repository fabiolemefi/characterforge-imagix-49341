import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { TitleOnlyBlock } from '@/components/brandguide/TitleOnlyBlock';
import { TextOnlyBlock } from '@/components/brandguide/TextOnlyBlock';
import { ImageBlock } from '@/components/brandguide/ImageBlock';
import { VideoBlock } from '@/components/brandguide/VideoBlock';
import { EmbedBlock } from '@/components/brandguide/EmbedBlock';
import { BrandGuideBlock } from '@/hooks/useBrandGuide';
import { useBrandGuideHomeBlocks } from '@/hooks/useBrandGuideHomeBlocks';
import { ErrorFallback } from '@/components/ErrorFallback';

export default function BrandGuideHome() {
  // React Query hook (com cache automático)
  const { data: blocks = [], isLoading: loading, error } = useBrandGuideHomeBlocks();

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
      case 'image':
        return (
          <div key={block.id}>
            <ImageBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      case 'video':
        return (
          <div key={block.id}>
            <VideoBlock 
              blockId={block.id} 
              content={block.content} 
              isAdmin={false} 
              onContentChange={() => {}} 
            />
          </div>
        );
      case 'embed':
        return (
          <div key={block.id}>
            <EmbedBlock 
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
                  message={error?.message || 'Erro desconhecido'}
                  onRetry={() => window.location.reload()}
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
