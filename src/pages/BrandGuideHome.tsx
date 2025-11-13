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
          <SingleColumnBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'two_columns':
        return (
          <TwoColumnBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'three_columns':
        return (
          <ThreeColumnBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'title_only':
        return (
          <TitleOnlyBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'text_only':
        return (
          <TextOnlyBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'image':
        return (
          <ImageBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'video':
        return (
          <VideoBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      case 'embed':
        return (
          <EmbedBlock 
            key={block.id}
            blockId={block.id} 
            content={block.content} 
            isAdmin={false} 
            onContentChange={() => {}} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen p-8 pt-8">
      {loading ? (
        <div className="space-y-8 animate-pulse">
          <div className="h-64 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      ) : error ? (
        <ErrorFallback
          title="Erro ao carregar conteúdo"
          message={error?.message || 'Erro desconhecido'}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <>
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
  );
}
