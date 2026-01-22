import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { ArrowLeft, Save, Download, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useEfiCodeSite, useEfiCodeSites, PageSettings, defaultPageSettings } from '@/hooks/useEfiCodeSites';
import { useEfiCodeConfig } from '@/hooks/useEfiCodeConfig';
import { Toolbox } from '@/components/eficode/editor/Toolbox';
import { SettingsPanel } from '@/components/eficode/editor/SettingsPanel';
import { 
  Container, 
  Text, 
  Heading, 
  Button as CraftButton, 
  Image, 
  Divider, 
  Spacer 
} from '@/components/eficode/user-components';

const resolvers = {
  Container,
  Text,
  Heading,
  Button: CraftButton,
  Image,
  Divider,
  Spacer,
};

// Função para gerar HTML a partir dos nodes serializados do Craft.js
const generateHtmlFromNodes = (nodes: Record<string, any>, nodeId: string = 'ROOT'): string => {
  const node = nodes[nodeId];
  if (!node) return '';

  const props = node.props || {};
  const childNodes = node.nodes || [];
  const linkedNodes = node.linkedNodes || {};
  
  // Gerar HTML dos filhos
  const childrenHtml = childNodes.map((id: string) => generateHtmlFromNodes(nodes, id)).join('\n');
  const linkedHtml = Object.values(linkedNodes).map((id: string) => generateHtmlFromNodes(nodes, id)).join('\n');
  const allChildrenHtml = childrenHtml + linkedHtml;

  // Mapear cada tipo de componente para HTML
  const componentType = node.type?.resolvedName || node.displayName || '';
  
  switch (componentType) {
    case 'Container':
      return `<div style="background-color: ${props.background || '#ffffff'}; padding: ${props.padding || 0}px; min-height: ${props.minHeight || 0}px; display: flex; flex-direction: column; gap: ${props.gap || 0}px;">
${allChildrenHtml}
</div>`;

    case 'Heading':
      const level = props.level || 'h2';
      const fontSizes: Record<string, number> = { h1: 36, h2: 30, h3: 24, h4: 20, h5: 18, h6: 16 };
      return `<${level} style="font-size: ${fontSizes[level]}px; font-weight: bold; color: ${props.color || '#1d1d1d'}; text-align: ${props.textAlign || 'left'}; margin: 0;">${props.text || ''}</${level}>`;

    case 'Text':
      return `<p style="font-size: ${props.fontSize || 16}px; color: ${props.color || '#374151'}; text-align: ${props.textAlign || 'left'}; line-height: ${props.lineHeight || 1.6}; margin: 0;">${props.text || ''}</p>`;

    case 'Button':
      return `<a href="${props.href || '#'}" style="display: ${props.fullWidth ? 'block' : 'inline-block'}; background-color: ${props.backgroundColor || '#00809d'}; color: ${props.textColor || '#ffffff'}; border-radius: ${props.borderRadius || 8}px; padding: ${props.paddingY || 12}px ${props.paddingX || 24}px; font-size: ${props.fontSize || 16}px; font-weight: ${props.fontWeight || '600'}; text-decoration: none; text-align: center; box-sizing: border-box; ${props.fullWidth ? 'width: 100%;' : ''}">${props.text || 'Clique Aqui'}</a>`;

    case 'Image':
      return `<img src="${props.src || ''}" alt="${props.alt || 'Imagem'}" style="width: ${props.width || '100%'}; height: ${props.height || 'auto'}; object-fit: ${props.objectFit || 'cover'}; border-radius: ${props.borderRadius || 0}px; display: block;" />`;

    case 'Divider':
      return `<hr style="border: none; border-top: ${props.thickness || 1}px ${props.style || 'solid'} ${props.color || '#e5e7eb'}; margin: ${props.marginY || 16}px 0;" />`;

    case 'Spacer':
      return `<div style="height: ${props.height || 24}px;"></div>`;

    default:
      return allChildrenHtml;
  }
};

// Função para gerar o HTML completo com configurações da página
const generateFullHtml = (
  nodes: Record<string, any>, 
  siteName: string, 
  pageSettings: PageSettings,
  globalCss: string = ''
): string => {
  const bodyContent = generateHtmlFromNodes(nodes, 'ROOT');
  
  // Google Analytics script
  const gaScript = pageSettings.googleAnalyticsId ? `
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${pageSettings.googleAnalyticsId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${pageSettings.googleAnalyticsId}');
  </script>` : '';

  // Facebook Pixel script
  const fbScript = pageSettings.facebookPixelId ? `
  <!-- Facebook Pixel -->
  <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pageSettings.facebookPixelId}');
    fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pageSettings.facebookPixelId}&ev=PageView&noscript=1"/></noscript>` : '';

  const title = pageSettings.title || siteName;
  const faviconLink = pageSettings.favicon ? `<link rel="icon" href="${pageSettings.favicon}">` : '';
  const metaDescription = pageSettings.description ? `<meta name="description" content="${pageSettings.description}">` : '';
  const metaKeywords = pageSettings.keywords ? `<meta name="keywords" content="${pageSettings.keywords}">` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${metaDescription}
  ${metaKeywords}
  ${faviconLink}
  ${gaScript}
  ${fbScript}
  ${pageSettings.customHeadCode || ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background-color: ${pageSettings.backgroundColor || '#ffffff'};
    }
    .page-container {
      max-width: ${pageSettings.containerMaxWidth || '1200'}px;
      margin: 0 auto;
    }
    img { max-width: 100%; }
    
    /* CSS Global do Efi Code */
    ${globalCss}
  </style>
</head>
<body>
  <div class="page-container">
${bodyContent}
  </div>
</body>
</html>`;
};

export default function EfiCodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: site, isLoading } = useEfiCodeSite(id);
  const { updateSite } = useEfiCodeSites();
  const { globalCss } = useEfiCodeConfig();
  const [siteName, setSiteName] = useState('');
  const [editorState, setEditorState] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings>(defaultPageSettings);

  useEffect(() => {
    if (site) {
      setSiteName(site.name);
      if (site.content && Object.keys(site.content).length > 0) {
        setEditorState(JSON.stringify(site.content));
      }
      if (site.page_settings) {
        setPageSettings(site.page_settings);
      }
    }
  }, [site]);

  const handleSave = useCallback(async (query: any) => {
    if (!id) return;
    
    const serialized = query.serialize();
    
    try {
      await updateSite.mutateAsync({
        id,
        name: siteName,
        content: JSON.parse(serialized),
        page_settings: pageSettings,
      });
      toast.success('Site salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  }, [id, siteName, pageSettings, updateSite]);

  const handleExport = useCallback((query: any) => {
    const serialized = query.serialize();
    const nodes = JSON.parse(serialized);
    
    // Gera HTML completo com todas as configurações e CSS global
    const html = generateFullHtml(nodes, siteName, pageSettings, globalCss);
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('HTML exportado!');
  }, [siteName, pageSettings, globalCss]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!site && id) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Site não encontrado</h2>
          <Button variant="outline" onClick={() => navigate('/efi-code')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Editor resolver={resolvers}>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/efi-code')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-64 font-medium"
              placeholder="Nome do site"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <EditorActions 
              onSave={handleSave} 
              onExport={handleExport}
            />
          </div>
        </header>

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Toolbox */}
          <aside className="w-56 border-r bg-background overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Toolbox />
            </ScrollArea>
          </aside>

          {/* Center - Viewport */}
          <main 
            className="flex-1 overflow-auto p-8"
            style={{ backgroundColor: pageSettings.backgroundColor }}
          >
            <div
              className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
              style={{ 
                minHeight: '600px',
                maxWidth: `${pageSettings.containerMaxWidth}px`,
              }}
            >
              <EditorFrame editorState={editorState} />
            </div>
          </main>

          {/* Right Sidebar - Settings */}
          <aside className="w-72 border-l bg-background overflow-hidden">
            <SettingsPanel 
              pageSettings={pageSettings}
              onPageSettingsChange={setPageSettings}
            />
          </aside>
        </div>
      </div>
    </Editor>
  );
}

// Componente para o Frame que carrega o estado salvo
function EditorFrame({ editorState }: { editorState: string | null }) {
  const { actions } = useEditor();

  useEffect(() => {
    if (editorState) {
      try {
        actions.deserialize(editorState);
      } catch (error) {
        console.error('Erro ao restaurar estado:', error);
      }
    }
  }, [editorState, actions]);

  return (
    <Frame>
      <Element
        is={Container}
        canvas
        background="#ffffff"
        padding={24}
        minHeight={600}
      >
        <Heading text="Bem-vindo ao Efi Code" level="h1" textAlign="center" />
        <Spacer height={16} />
        <Text 
          text="Arraste componentes da barra lateral para começar a construir sua página." 
          textAlign="center"
          color="#64748b"
        />
      </Element>
    </Frame>
  );
}

// Componente separado para acessar o hook useEditor
function EditorActions({ 
  onSave, 
  onExport 
}: { 
  onSave: (query: any) => void;
  onExport: (query: any) => void;
}) {
  const { query, canUndo, canRedo, actions } = useEditor((state, query) => ({
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canUndo}
        onClick={() => actions.history.undo()}
        title="Desfazer"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={!canRedo}
        onClick={() => actions.history.redo()}
        title="Refazer"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-2" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => onExport(query)}
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar HTML
      </Button>
      <Button
        size="sm"
        onClick={() => onSave(query)}
      >
        <Save className="h-4 w-4 mr-2" />
        Salvar
      </Button>
    </>
  );
}
