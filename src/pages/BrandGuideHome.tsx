import { useState } from 'react';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { TitleOnlyBlock } from '@/components/brandguide/TitleOnlyBlock';
import { TextOnlyBlock } from '@/components/brandguide/TextOnlyBlock';
import { ImageBlock } from '@/components/brandguide/ImageBlock';
import { VideoBlock } from '@/components/brandguide/VideoBlock';
import { EmbedBlock } from '@/components/brandguide/EmbedBlock';
import { SeparatorBlock } from '@/components/brandguide/SeparatorBlock';
import { BrandGuideBlock } from '@/hooks/useBrandGuide';
import { useBrandGuideHomeBlocks } from '@/hooks/useBrandGuideHomeBlocks';
import { ErrorFallback } from '@/components/ErrorFallback';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function BrandGuideHome() {
  const { data: blocks = [], isLoading: loading, error } = useBrandGuideHomeBlocks();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase.functions.invoke('export-brand-guide');
      if (error) throw error;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand-guide-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Conteúdo exportado com sucesso!');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Erro ao exportar conteúdo');
    } finally {
      setExporting(false);
    }
  };

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
      case 'separator':
        return (
          <SeparatorBlock 
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
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar conteúdo
            </Button>
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
  );
}
