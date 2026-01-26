import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEfiCodeContext } from '@/components/eficode/EfiCodeContext';

interface IframePreviewProps {
  html: string;
  className?: string;
  onClick?: () => void;
  minHeight?: number;
}

export const IframePreview = ({ 
  html, 
  className = '', 
  onClick,
  minHeight = 100 
}: IframePreviewProps) => {
  const { globalCss } = useEfiCodeContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

  // Build the complete HTML document for the iframe
  // Não aplicamos nenhum reset - deixamos o globalCss controlar 100% dos estilos
  const srcdoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Global CSS do admin - controla 100% dos estilos */
    ${globalCss}
  </style>
</head>
<body>
  ${html}
  <script>
    // Comunicar altura para o parent
    function sendHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'eficode-iframe-height', height }, '*');
    }
    
    // Observar mudanças no conteúdo
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    
    // Enviar altura inicial após load
    window.addEventListener('load', sendHeight);
    sendHeight();
    
    // Propagar cliques para o parent
    document.body.addEventListener('click', (e) => {
      window.parent.postMessage({ type: 'eficode-iframe-click' }, '*');
    });
  </script>
</body>
</html>
  `;

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'eficode-iframe-height') {
        const newHeight = Math.max(event.data.height, minHeight);
        setHeight(newHeight);
      }
      if (event.data?.type === 'eficode-iframe-click') {
        onClick?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClick, minHeight]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: `${minHeight}px` }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        className="w-full border-0 block"
        style={{ 
          height: `${height}px`,
          pointerEvents: onClick ? 'auto' : 'none',
        }}
        title="HTML Preview"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Overlay invisível para capturar cliques quando em modo edição */}
      {onClick && (
        <div 
          className="absolute inset-0 cursor-pointer" 
          onClick={onClick}
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
};
