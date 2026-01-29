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
  const lastHeightRef = useRef(minHeight);

  // Build the complete HTML document for the iframe - memoizado
  // editable removido das dependências - controlado via postMessage
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
  ${html}
  <script>
    let editMode = false;
    
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
    
    // Escutar comandos do parent para controlar edição
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'eficode-set-editable') {
        editMode = e.data.editable;
        document.body.contentEditable = editMode ? 'true' : 'false';
        if (editMode) document.body.focus({ preventScroll: true });
      }
    });
    
    // Input handling (sempre configurado, só funciona quando editMode=true)
    let debounceTimer;
    document.body.addEventListener('input', () => {
      if (!editMode) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        window.parent.postMessage({ 
          type: 'eficode-html-change', 
          html: document.body.innerHTML 
        }, '*');
      }, 100);
      sendHeight();
    });
    
    // Blur com delay para evitar race condition
    let blurTimer;
    document.body.addEventListener('blur', () => {
      if (!editMode) return;
      clearTimeout(debounceTimer);
      clearTimeout(blurTimer);
      
      blurTimer = setTimeout(() => {
        window.parent.postMessage({ 
          type: 'eficode-edit-end',
          html: document.body.innerHTML 
        }, '*');
      }, 150);
    });
    
    // Cancelar blur timer se receber foco novamente
    document.body.addEventListener('focus', () => {
      clearTimeout(blurTimer);
    });
    
    // Escape para sair do modo de edição
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && editMode) {
        clearTimeout(debounceTimer);
        clearTimeout(blurTimer);
        window.parent.postMessage({ 
          type: 'eficode-edit-end',
          html: document.body.innerHTML 
        }, '*');
      }
    });
    
    // Mousedown para capturar clique (antes do focus)
    document.body.addEventListener('mousedown', (e) => {
      if (!editMode) {
        window.parent.postMessage({ type: 'eficode-iframe-click' }, '*');
      }
    });
  </script>
</body>
</html>
  `, [globalCss, html]); // editable removido - controlado via postMessage

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'eficode-iframe-height') {
        const newHeight = Math.max(event.data.height, minHeight);
        // Só atualiza se realmente mudou para evitar re-renders
        if (newHeight !== lastHeightRef.current) {
          lastHeightRef.current = newHeight;
          setHeight(newHeight);
        }
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

  // Enviar mensagem para ativar/desativar edição (sem recriar iframe)
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'eficode-set-editable', editable },
        '*'
      );
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
          pointerEvents: 'auto', // Sempre permitir interação
        }}
        title="HTML Preview"
        sandbox="allow-scripts allow-same-origin"
      />
      {/* Overlay removido - cliques vão direto para o iframe */}
    </div>
  );
};
