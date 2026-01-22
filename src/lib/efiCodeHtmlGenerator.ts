import { PageSettings } from '@/hooks/useEfiCodeSites';

// Função para gerar HTML a partir dos nodes serializados do Craft.js
export const generateHtmlFromNodes = (nodes: Record<string, any>, nodeId: string = 'ROOT'): string => {
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
export const generateFullHtml = (
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background-color: ${pageSettings.backgroundColor || '#ffffff'};
      ${pageSettings.backgroundImage ? `
      background-image: url('${pageSettings.backgroundImage}');
      background-size: ${pageSettings.backgroundSize || 'cover'};
      background-position: ${pageSettings.backgroundPosition || 'center'};
      background-attachment: ${pageSettings.backgroundAttachment || 'scroll'};
      background-repeat: ${pageSettings.backgroundRepeat || 'no-repeat'};
      ` : ''}
      min-height: 100vh;
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
