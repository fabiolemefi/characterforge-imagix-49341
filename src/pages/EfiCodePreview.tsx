import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useEfiCodeSite, defaultPageSettings } from '@/hooks/useEfiCodeSites';
import { useEfiCodeConfig } from '@/hooks/useEfiCodeConfig';
import { generateFullHtml } from '@/lib/efiCodeHtmlGenerator';
import { Skeleton } from '@/components/ui/skeleton';

export default function EfiCodePreview() {
  const { id } = useParams();
  const { data: site, isLoading } = useEfiCodeSite(id);
  const { globalCss } = useEfiCodeConfig();

  const html = useMemo(() => {
    if (!site?.content || Object.keys(site.content).length === 0) {
      return '';
    }
    return generateFullHtml(
      site.content,
      site.name,
      site.page_settings || defaultPageSettings,
      globalCss
    );
  }, [site, globalCss]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Site não encontrado</h2>
          <p className="text-muted-foreground">O site solicitado não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Prévia vazia</h2>
          <p className="text-muted-foreground">Este site ainda não possui conteúdo.</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      className="w-full h-screen border-0"
      title={`Prévia: ${site.name}`}
    />
  );
}
