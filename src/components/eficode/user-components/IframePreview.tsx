import React, { useRef, useEffect, useState } from 'react';
import { useEfiCodeContext } from '@/components/eficode/EfiCodeContext';

interface IframePreviewProps {
  html: string;
  className?: string;
  onClick?: () => void;
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
  
  // Memorizar o HTML inicial quando entra em modo de edição
  // Isso evita que o srcdoc seja recriado a cada digitação
  const [editingStartHtml, setEditingStartHtml] = useState<string | null>(null);
  
  // Quando editable muda para true, salvar o HTML atual
  useEffect(() => {
    if (editable) {
      setEditingStartHtml(html);
    } else {
      setEditingStartHtml(null);
    }
  }, [editable]); // Propositalmente não inclui html como dependência
  
  // Usar o HTML "travado" durante edição para evitar recriação do iframe
  const stableHtml = editable && editingStartHtml !== null ? editingStartHtml : html;

  // Build the complete HTML document for the iframe
  const srcdoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
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
      const height = document.body.scrollHeight;
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
      
      // Enviar mudanças de HTML para o parent
      document.body.addEventListener('input', () => {
        window.parent.postMessage({ 
          type: 'eficode-html-change', 
          html: document.body.innerHTML 
        }, '*');
        sendHeight();
      });
      
      // Detectar quando perde o foco
      document.body.addEventListener('blur', () => {
        window.parent.postMessage({ 
          type: 'eficode-edit-end',
          html: document.body.innerHTML 
        }, '*');
      });
      
      // Escape para sair do modo de edição
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
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
    <div className={`relative ${className}`} style={{ minHeight: `${minHeight}px` }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        className="w-full border-0 block"
        style={{ 
          height: `${height}px`,
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
