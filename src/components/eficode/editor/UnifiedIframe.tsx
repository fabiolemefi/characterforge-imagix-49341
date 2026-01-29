import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Block } from '@/stores/efiCodeEditorStore';

interface UnifiedIframeProps {
  blocks: Block[];
  globalCss: string;
  selectedBlockId: string | null;
  viewportWidth: string;
  onBlockClick: (blockId: string) => void;
  onBlockDoubleClick: (blockId: string) => void;
  onBlockEdit: (blockId: string, newHtml: string) => void;
}

export const UnifiedIframe: React.FC<UnifiedIframeProps> = ({
  blocks,
  globalCss,
  selectedBlockId,
  viewportWidth,
  onBlockClick,
  onBlockDoubleClick,
  onBlockEdit,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editingBlockIdRef = useRef<string | null>(null);

  // Generate srcDoc content
  const srcDoc = useMemo(() => {
    const blocksHtml = blocks.map(block => `
      <div 
        data-block-id="${block.id}" 
        class="efi-block ${selectedBlockId === block.id ? 'selected' : ''}"
      >
        ${block.html}
      </div>
    `).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Global CSS from config */
    ${globalCss}
    
    /* Editor-specific styles */
    * {
      box-sizing: border-box;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    body {
      padding: 0;
    }
    
    /* Block wrapper styles */
    .efi-block {
      position: relative;
      transition: outline 0.15s ease;
    }
    
    .efi-block:hover:not(.selected) {
      outline: 1px dashed #9ca3af;
      outline-offset: 2px;
    }
    
    .efi-block.selected {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    .efi-block.editing {
      outline: 2px solid #f97316;
      outline-offset: 2px;
    }
    
    /* Ensure contenteditable elements are visible */
    [contenteditable="true"] {
      outline: none;
      min-height: 1em;
    }
    
    /* Empty block placeholder */
    .efi-block:empty::before {
      content: 'Bloco vazio';
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  ${blocksHtml}
  
  <script>
    // Track editing state
    let currentEditingBlock = null;
    let clickCount = 0;
    let clickTimer = null;
    
    // Handle clicks on blocks
    document.addEventListener('click', function(e) {
      const block = e.target.closest('[data-block-id]');
      
      if (block) {
        const blockId = block.dataset.blockId;
        
        // Clear previous click timer
        if (clickTimer) {
          clearTimeout(clickTimer);
        }
        
        clickCount++;
        
        if (clickCount === 1) {
          // Single click - wait to see if it's a double click
          clickTimer = setTimeout(function() {
            clickCount = 0;
            window.parent.postMessage({
              type: 'eficode-block-click',
              blockId: blockId
            }, '*');
          }, 250);
        } else if (clickCount === 2) {
          // Double click - enable editing
          clickCount = 0;
          window.parent.postMessage({
            type: 'eficode-block-doubleclick',
            blockId: blockId
          }, '*');
        }
      }
    });
    
    // Handle contenteditable blur to save changes
    document.addEventListener('blur', function(e) {
      const block = e.target.closest('[data-block-id]');
      if (block && block.hasAttribute('contenteditable')) {
        const blockId = block.dataset.blockId;
        window.parent.postMessage({
          type: 'eficode-block-edit',
          blockId: blockId,
          html: block.innerHTML
        }, '*');
        
        // Remove contenteditable
        block.removeAttribute('contenteditable');
        block.classList.remove('editing');
        currentEditingBlock = null;
      }
    }, true);
    
    // Listen for messages from parent
    window.addEventListener('message', function(e) {
      if (e.data.type === 'eficode-enable-edit') {
        const block = document.querySelector('[data-block-id="' + e.data.blockId + '"]');
        if (block) {
          // Remove editing from previous block
          if (currentEditingBlock && currentEditingBlock !== block) {
            currentEditingBlock.removeAttribute('contenteditable');
            currentEditingBlock.classList.remove('editing');
          }
          
          block.setAttribute('contenteditable', 'true');
          block.classList.add('editing');
          block.focus();
          currentEditingBlock = block;
          
          // Select all content
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(block);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else if (e.data.type === 'eficode-disable-edit') {
        if (currentEditingBlock) {
          // Save content before disabling
          window.parent.postMessage({
            type: 'eficode-block-edit',
            blockId: currentEditingBlock.dataset.blockId,
            html: currentEditingBlock.innerHTML
          }, '*');
          
          currentEditingBlock.removeAttribute('contenteditable');
          currentEditingBlock.classList.remove('editing');
          currentEditingBlock = null;
        }
      } else if (e.data.type === 'eficode-update-selection') {
        // Update visual selection
        document.querySelectorAll('.efi-block').forEach(function(block) {
          if (block.dataset.blockId === e.data.blockId) {
            block.classList.add('selected');
          } else {
            block.classList.remove('selected');
          }
        });
      } else if (e.data.type === 'eficode-scroll-to-block') {
        const block = document.querySelector('[data-block-id="' + e.data.blockId + '"]');
        if (block) {
          block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
    
    // Prevent default drag behavior
    document.addEventListener('dragstart', function(e) {
      e.preventDefault();
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Escape to exit editing mode
      if (e.key === 'Escape' && currentEditingBlock) {
        currentEditingBlock.blur();
      }
    });
  </script>
</body>
</html>`;
  }, [blocks, globalCss, selectedBlockId]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      
      switch (event.data.type) {
        case 'eficode-block-click':
          onBlockClick(event.data.blockId);
          break;
        case 'eficode-block-doubleclick':
          onBlockDoubleClick(event.data.blockId);
          break;
        case 'eficode-block-edit':
          if (event.data.html !== undefined) {
            onBlockEdit(event.data.blockId, event.data.html);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onBlockClick, onBlockDoubleClick, onBlockEdit]);

  // Send selection update to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'eficode-update-selection',
        blockId: selectedBlockId
      }, '*');
    }
  }, [selectedBlockId]);

  // Enable editing mode for a block
  const enableEditing = useCallback((blockId: string) => {
    if (iframeRef.current?.contentWindow) {
      editingBlockIdRef.current = blockId;
      iframeRef.current.contentWindow.postMessage({
        type: 'eficode-enable-edit',
        blockId
      }, '*');
    }
  }, []);

  // Disable editing mode
  const disableEditing = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'eficode-disable-edit'
      }, '*');
      editingBlockIdRef.current = null;
    }
  }, []);

  // Scroll to a block
  const scrollToBlock = useCallback((blockId: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'eficode-scroll-to-block',
        blockId
      }, '*');
    }
  }, []);

  // Expose methods via ref if needed
  useEffect(() => {
    // Attach methods to iframe element for external access
    const iframe = iframeRef.current;
    if (iframe) {
      (iframe as any).enableEditing = enableEditing;
      (iframe as any).disableEditing = disableEditing;
      (iframe as any).scrollToBlock = scrollToBlock;
    }
  }, [enableEditing, disableEditing, scrollToBlock]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      className="w-full h-full border-0"
      style={{
        width: viewportWidth,
        minHeight: '100%',
        background: 'white',
      }}
      sandbox="allow-scripts allow-same-origin"
      title="Efi Code Editor Preview"
    />
  );
};

// Export ref methods type for consumers
export interface UnifiedIframeRef {
  enableEditing: (blockId: string) => void;
  disableEditing: () => void;
  scrollToBlock: (blockId: string) => void;
}
