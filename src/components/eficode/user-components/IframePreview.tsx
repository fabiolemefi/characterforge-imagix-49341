import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useEfiCodeContext } from '@/components/eficode/EfiCodeContext';

interface IframePreviewProps {
  html: string;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
  minHeight?: number;
  editable?: boolean;
  onHtmlChange?: (html: string) => void;
  onEditEnd?: (html: string) => void;
}

export const IframePreview = ({ 
  html, 
  className = '', 
  onClick,
  minHeight = 100,
  editable = false,
  onHtmlChange,
  onEditEnd
}: IframePreviewProps) => {
  const { globalCss } = useEfiCodeContext();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);
  
  // Ref para armazenar o HTML "travado" durante edição
  // Isso evita recriação do srcdoc enquanto o usuário edita
  const lockedHtmlRef = useRef<string | null>(null);
  
  // Quando entra em modo de edição, travar o HTML atual
  // Quando sai, liberar
  useEffect(() => {
    if (editable) {
      lockedHtmlRef.current = html;
    } else {
      lockedHtmlRef.current = null;
    }
  }, [editable]); // Propositalmente não inclui html como dependência
  
  // Usar o HTML "travado" durante edição para evitar recriação do iframe
  const stableHtml = useMemo(() => {
    if (editable && lockedHtmlRef.current !== null) {
      return lockedHtmlRef.current;
    }
    return html;
  }, [editable, html]);

  // Build the complete HTML document for the iframe - memoizado
  const srcdoc = useMemo(() => `
<!DOCTYPE html>
<html style="width: 100%; height: auto;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset essencial para responsividade */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: auto;
      overflow: hidden;
    }
    body {
      overflow: hidden;
    }
    img, video, iframe {
      max-width: 100%;
      height: auto;
    }
    
    /* Global CSS do admin - controla 100% dos estilos */
    ${globalCss}
    
    /* Estilos para modo de edição */
    body[contenteditable="true"] {
      outline: none;
      cursor: text;
    }
    body[contenteditable="true"]:focus {
      outline: 2px solid hsl(221.2 83.2% 53.3%);
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  ${stableHtml}
  <script>
    const EDITABLE_MODE = ${editable};
    
    // Comunicar altura para o parent
    function sendHeight() {
      const height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
      window.parent.postMessage({ type: 'eficode-iframe-height', height }, '*');
    }
    
    // Observar mudanças no conteúdo
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    
    // Enviar altura inicial após load
    window.addEventListener('load', sendHeight);
    sendHeight();
    
    if (EDITABLE_MODE) {
      // Ativar modo de edição
      document.body.contentEditable = 'true';
      document.body.focus();
      
      // Enviar mudanças de HTML para o parent com debounce
      let debounceTimer;
      document.body.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          window.parent.postMessage({ 
            type: 'eficode-html-change', 
            html: document.body.innerHTML 
          }, '*');
        }, 100);
        sendHeight();
      });
      
      // Detectar quando perde o foco
      document.body.addEventListener('blur', () => {
        clearTimeout(debounceTimer);
        window.parent.postMessage({ 
          type: 'eficode-edit-end',
          html: document.body.innerHTML 
        }, '*');
      });
      
      // Escape para sair do modo de edição
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearTimeout(debounceTimer);
          window.parent.postMessage({ 
            type: 'eficode-edit-end',
            html: document.body.innerHTML 
          }, '*');
        }
      });
    } else {
      // Propagar cliques para o parent apenas em modo não editável
      document.body.addEventListener('click', (e) => {
        window.parent.postMessage({ type: 'eficode-iframe-click' }, '*');
      });
    }
  </script>
</body>
</html>
  `, [globalCss, stableHtml, editable]);

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
      if (event.data?.type === 'eficode-html-change') {
        onHtmlChange?.(event.data.html);
      }
      if (event.data?.type === 'eficode-edit-end') {
        onEditEnd?.(event.data.html);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClick, minHeight, onHtmlChange, onEditEnd]);

  // Focus iframe when entering edit mode
  useEffect(() => {
    if (editable && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [editable]);

  return (
    <div className={`relative w-full ${className}`}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        scrolling="no"
        style={{ 
          display: 'block',
          width: '100%',
          height: `${height}px`,
          border: 'none',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          pointerEvents: editable ? 'auto' : (onClick ? 'auto' : 'none'),
        }}
        title="HTML Preview"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Overlay invisível para capturar cliques quando NÃO está em modo de edição */}
      {!editable && onClick && (
        <div 
          className="absolute inset-0 cursor-pointer" 
          onClick={onClick}
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
};