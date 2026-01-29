import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Block } from '@/stores/efiCodeEditorStore';

interface UnifiedIframeProps {
  blocks: Block[];
  globalCss: string;
  selectedBlockId: string | null;
  viewportWidth: string;
  themeMode?: 'light' | 'dark';
  scrollToBlockId?: string | null;
  onBlockClick: (blockId: string) => void;
  onBlockDoubleClick: (blockId: string) => void;
  onBlockEdit: (blockId: string, newHtml: string) => void;
  onScrollComplete?: () => void;
}

export const UnifiedIframe: React.FC<UnifiedIframeProps> = ({
  blocks,
  globalCss,
  selectedBlockId,
  viewportWidth,
  themeMode = 'light',
  scrollToBlockId,
  onBlockClick,
  onBlockDoubleClick,
  onBlockEdit,
  onScrollComplete,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editingBlockIdRef = useRef<string | null>(null);
  const scrollPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevSrcDocRef = useRef<string>('');

  // Save scroll position before render (runs synchronously before DOM updates)
  const saveScrollPosition = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        scrollPositionRef.current = {
          x: iframeRef.current.contentWindow.scrollX || 0,
          y: iframeRef.current.contentWindow.scrollY || 0
        };
      } catch (e) {
        // Cross-origin or not ready, ignore
      }
    }
  }, []);

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
<html lang="pt-BR" data-theme="${themeMode}">
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
    
    .efi-block:hover:not(.selected):not(.editing) {
      outline: 1px dashed #9ca3af;
      outline-offset: 2px;
    }
    
    .efi-block.selected:not(.editing) {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    .efi-block.editing {
      outline: 3px solid #f97316;
      outline-offset: 4px;
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
    
    /* Clickable images indicator */
    .efi-block:not(.editing) img {
      cursor: pointer;
      transition: outline 0.15s ease, opacity 0.15s ease;
    }
    
    .efi-block:not(.editing) img:hover {
      outline: 2px solid #8b5cf6;
      outline-offset: 2px;
      opacity: 0.9;
    }
    
    /* Clickable links and buttons indicator */
    .efi-block:not(.editing) a,
    .efi-block:not(.editing) button {
      cursor: pointer;
      transition: outline 0.15s ease, opacity 0.15s ease;
    }
    
    .efi-block:not(.editing) a:hover,
    .efi-block:not(.editing) button:hover {
      outline: 2px solid #10b981;
      outline-offset: 2px;
      opacity: 0.9;
    }
    
    /* Clickable iframes (video embeds) indicator */
    .efi-block:not(.editing) iframe {
      cursor: pointer;
      transition: outline 0.15s ease;
      pointer-events: none;
    }
    
    .efi-block:not(.editing) .iframe-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      cursor: pointer;
      z-index: 10;
    }
    
    .efi-block:not(.editing) .iframe-overlay:hover + iframe,
    .efi-block:not(.editing) .iframe-wrapper:hover iframe {
      outline: 2px solid #f59e0b;
      outline-offset: 2px;
    }
    
    .efi-block:not(.editing) .iframe-wrapper {
      position: relative;
      display: inline-block;
    }
    
    /* Edit mode indicator */
    #edit-mode-indicator {
      position: fixed;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    #edit-mode-indicator kbd {
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
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
    let editIndicator = null;
    
    // Wrap iframes in clickable overlays for editing
    function wrapIframes() {
      document.querySelectorAll('.efi-block iframe').forEach(function(iframe) {
        // Skip if already wrapped
        if (iframe.parentElement && iframe.parentElement.classList.contains('iframe-wrapper')) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'iframe-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'block';
        wrapper.style.width = iframe.offsetWidth ? iframe.offsetWidth + 'px' : '100%';
        wrapper.style.height = iframe.offsetHeight ? iframe.offsetHeight + 'px' : 'auto';
        
        const overlay = document.createElement('div');
        overlay.className = 'iframe-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.cursor = 'pointer';
        overlay.style.zIndex = '10';
        overlay.style.background = 'transparent';
        
        // Store reference to iframe
        overlay.dataset.iframeSrc = iframe.getAttribute('src') || '';
        
        iframe.parentNode.insertBefore(wrapper, iframe);
        wrapper.appendChild(overlay);
        wrapper.appendChild(iframe);
      });
    }
    
    // Run after DOM is ready
    wrapIframes();
    
    // Create edit mode indicator
    function showEditIndicator() {
      if (editIndicator) return;
      
      editIndicator = document.createElement('div');
      editIndicator.id = 'edit-mode-indicator';
      editIndicator.innerHTML = '✏️ Modo de Edição • <kbd>ESC</kbd> para sair';
      document.body.appendChild(editIndicator);
    }
    
    function hideEditIndicator() {
      if (editIndicator) {
        editIndicator.remove();
        editIndicator = null;
      }
    }
    
    // Handle clicks on blocks
    document.addEventListener('click', function(e) {
      const block = e.target.closest('[data-block-id]');
      
      // If block is in editing mode, don't intercept clicks
      if (block && block.classList.contains('editing')) {
        return;
      }
      
      // Check if clicked on iframe overlay (video embed)
      if (e.target.classList.contains('iframe-overlay') && block) {
        e.stopPropagation();
        e.preventDefault();
        
        const overlay = e.target;
        const wrapper = overlay.closest('.iframe-wrapper');
        const iframe = wrapper ? wrapper.querySelector('iframe') : null;
        const iframeSrc = iframe ? iframe.getAttribute('src') : overlay.dataset.iframeSrc;
        const blockId = block.dataset.blockId;
        
        // Find occurrence index
        const allIframes = Array.from(block.querySelectorAll('iframe'));
        const occurrenceIndex = iframe ? allIframes.indexOf(iframe) : 0;
        
        window.parent.postMessage({
          type: 'eficode-embed-click',
          blockId: blockId,
          embedSrc: iframeSrc,
          occurrenceIndex: occurrenceIndex
        }, '*');
        
        return;
      }
      
      // FIRST: Check if clicked DIRECTLY on an image (even inside a link)
      // This ensures image clicks always open image modal, not link modal
      if (e.target.tagName === 'IMG' && block) {
        e.stopPropagation();
        e.preventDefault();
        
        const img = e.target;
        const blockId = block.dataset.blockId;
        const imgSrc = img.getAttribute('src');
        const picture = img.closest('picture');
        
        // Find the occurrence index of this image among all images with the same src
        const allImgs = Array.from(block.querySelectorAll('img'));
        const sameSourceImgs = allImgs.filter(function(i) {
          return i.getAttribute('src') === imgSrc;
        });
        const occurrenceIndex = sameSourceImgs.indexOf(img);
        
        // If inside a picture element, collect all sources
        if (picture) {
          const sources = Array.from(picture.querySelectorAll('source')).map(function(s) {
            return {
              src: s.getAttribute('srcset'),
              media: s.getAttribute('media'),
              tagType: 'source'
            };
          });
          sources.push({ src: imgSrc, media: null, tagType: 'img' });
          
          window.parent.postMessage({
            type: 'eficode-image-click',
            blockId: blockId,
            imageSrc: imgSrc,
            isPicture: true,
            sources: sources,
            occurrenceIndex: occurrenceIndex
          }, '*');
        } else {
          // Simple image
          window.parent.postMessage({
            type: 'eficode-image-click',
            blockId: blockId,
            imageSrc: imgSrc,
            isPicture: false,
            occurrenceIndex: occurrenceIndex
          }, '*');
        }
        
        return; // Don't continue to link/button detection
      }
      
      // SECOND: Check if clicked on a link or button (but NOT on an image inside it)
      const link = e.target.closest('a');
      const button = e.target.closest('button');
      
      if ((link || button) && block) {
        e.stopPropagation();
        e.preventDefault(); // Prevent navigation
        
        const element = link || button;
        const elementType = link ? 'link' : 'button';
        const href = element.getAttribute('href');
        const targetAttr = element.getAttribute('target');
        const text = element.textContent || '';
        const blockId = block.dataset.blockId;
        
        // Check for inner images/icons (useful for "Change Icon" button)
        const innerImg = element.querySelector('img');
        const innerSvg = element.querySelector('svg');
        const innerSvgImage = innerSvg ? innerSvg.querySelector('image') : null;
        
        // Determine if there's an inner image (regular img OR svg with image element)
        const hasInnerImage = !!innerImg || !!innerSvgImage;
        
        // Get the image src - from img tag OR from svg image's xlink:href/href
        let innerImageSrc = null;
        let innerImageType = null; // 'img' or 'svg-image'
        
        if (innerImg) {
          innerImageSrc = innerImg.getAttribute('src');
          innerImageType = 'img';
        } else if (innerSvgImage) {
          innerImageSrc = innerSvgImage.getAttribute('xlink:href') || innerSvgImage.getAttribute('href');
          innerImageType = 'svg-image';
        }
        
        // Calculate the CORRECT occurrence index for the inner image
        let innerImageOccurrenceIndex = 0;
        if (innerImg && innerImageSrc) {
          const allImgs = Array.from(block.querySelectorAll('img'));
          const sameSourceImgs = allImgs.filter(function(i) {
            return i.getAttribute('src') === innerImageSrc;
          });
          innerImageOccurrenceIndex = sameSourceImgs.indexOf(innerImg);
        } else if (innerSvgImage && innerImageSrc) {
          const allSvgImages = Array.from(block.querySelectorAll('svg image'));
          const sameSourceSvgImages = allSvgImages.filter(function(i) {
            const src = i.getAttribute('xlink:href') || i.getAttribute('href');
            return src === innerImageSrc;
          });
          innerImageOccurrenceIndex = sameSourceSvgImages.indexOf(innerSvgImage);
        }
        
        // Find occurrence index for the link/button element itself
        const selector = elementType === 'link' ? 'a' : 'button';
        const allElements = Array.from(block.querySelectorAll(selector));
        const occurrenceIndex = allElements.indexOf(element);
        
        window.parent.postMessage({
          type: 'eficode-link-click',
          blockId: blockId,
          elementType: elementType,
          href: href,
          text: text,
          target: targetAttr,
          occurrenceIndex: occurrenceIndex,
          hasInnerImage: hasInnerImage,
          innerImageSrc: innerImageSrc,
          innerImageOccurrenceIndex: innerImageOccurrenceIndex,
          innerImageType: innerImageType
        }, '*');
        
        return;
      }
      
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
        hideEditIndicator();
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
          block.classList.remove('selected');
          currentEditingBlock = block;
          
          // Focus without selecting all - cursor stays where user clicked
          block.focus({ preventScroll: true });
          
          // Show edit mode indicator
          showEditIndicator();
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
          hideEditIndicator();
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
  }, [blocks, globalCss, selectedBlockId, themeMode]);

  // Save scroll position before srcDoc changes, restore after load (or scroll to new block)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Save current scroll position before iframe reloads (only if not adding a new block)
    if (!scrollToBlockId) {
      saveScrollPosition();
    }

    const handleLoad = () => {
      // If we need to scroll to a specific block (new block added)
      if (scrollToBlockId) {
        setTimeout(() => {
          try {
            iframe.contentWindow?.postMessage({
              type: 'eficode-scroll-to-block',
              blockId: scrollToBlockId
            }, '*');
            onScrollComplete?.();
          } catch (e) {
            // Ignore
          }
        }, 50);
      } else if (prevSrcDocRef.current !== '' && (scrollPositionRef.current.y > 0 || scrollPositionRef.current.x > 0)) {
        // Restore previous scroll position (for edits like image replacement)
        setTimeout(() => {
          try {
            iframe.contentWindow?.scrollTo(
              scrollPositionRef.current.x,
              scrollPositionRef.current.y
            );
          } catch (e) {
            // Cross-origin or not ready, ignore
          }
        }, 50);
      }
      prevSrcDocRef.current = srcDoc;
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [srcDoc, saveScrollPosition, scrollToBlockId, onScrollComplete]);
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
