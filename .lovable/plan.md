
# Plano: Edição de Links/Botões e Scrollbar Elegante

## Objetivo

1. **Permitir editar texto e href de links/botões** diretamente clicando neles no preview (similar ao funcionamento atual para imagens)
2. **Aplicar uma scrollbar mais elegante** no container que envolve o iframe do editor

---

## Parte 1: Edição de Links e Botões

### Fluxo Proposto

```text
1. Usuário clica em um <a> ou <button> no iframe
2. Iframe detecta o clique e envia mensagem postMessage
3. EfiCodeEditor recebe a mensagem e abre um modal de edição
4. Modal permite editar:
   - Texto do elemento
   - URL (href) se for um link
5. Ao confirmar, substitui o elemento no HTML do bloco
```

### 1.1 UnifiedIframe.tsx - Detectar cliques em links/botões

Adicionar lógica no script do iframe para detectar cliques em `<a>` e `<button>`:

```javascript
// No script do iframe, antes da lógica de imagem
const link = e.target.closest('a');
const button = e.target.closest('button');

if ((link || button) && block && !block.classList.contains('editing')) {
  e.stopPropagation();
  e.preventDefault(); // Evitar navegação
  
  const element = link || button;
  const elementType = link ? 'link' : 'button';
  const href = link ? link.getAttribute('href') : null;
  const text = element.textContent || '';
  
  // Encontrar índice de ocorrência
  const selector = elementType === 'link' ? 'a' : 'button';
  const allElements = Array.from(block.querySelectorAll(selector));
  const occurrenceIndex = allElements.indexOf(element);
  
  window.parent.postMessage({
    type: 'eficode-link-click',
    blockId: blockId,
    elementType: elementType,
    href: href,
    text: text,
    occurrenceIndex: occurrenceIndex
  }, '*');
  
  return;
}
```

Adicionar estilos para feedback visual em links e botões:

```css
/* Indicador de que links/botões são clicáveis */
.efi-block:not(.editing) a,
.efi-block:not(.editing) button {
  cursor: pointer;
  transition: outline 0.15s ease, opacity 0.15s ease;
}

.efi-block:not(.editing) a:hover,
.efi-block:not(.editing) button:hover {
  outline: 2px solid #10b981; /* Verde esmeralda */
  outline-offset: 2px;
  opacity: 0.9;
}
```

### 1.2 EfiCodeEditor.tsx - Novo estado e modal

Adicionar estado para edição de links:

```typescript
const [linkEditorOpen, setLinkEditorOpen] = useState(false);
const [editingLinkContext, setEditingLinkContext] = useState<{
  blockId: string;
  elementType: 'link' | 'button';
  href: string | null;
  text: string;
  occurrenceIndex: number;
} | null>(null);
```

Handler para clique em link:

```typescript
const handleLinkClick = useCallback((
  blockId: string,
  elementType: 'link' | 'button',
  href: string | null,
  text: string,
  occurrenceIndex: number
) => {
  selectBlock(blockId);
  setEditingLinkContext({ blockId, elementType, href, text, occurrenceIndex });
  setLinkEditorOpen(true);
}, [selectBlock]);
```

Handler para salvar edição do link:

```typescript
const handleLinkSave = useCallback((newText: string, newHref: string | null) => {
  if (!editingLinkContext) return;
  
  const block = blocks.find(b => b.id === editingLinkContext.blockId);
  if (!block) return;
  
  const { elementType, text: originalText, href: originalHref, occurrenceIndex } = editingLinkContext;
  let newHtml = block.html;
  
  // Regex para encontrar o elemento
  const tagName = elementType === 'link' ? 'a' : 'button';
  const escapedText = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Encontrar todas as ocorrências e substituir apenas a N-ésima
  const regex = new RegExp(`(<${tagName}[^>]*>)([\\s\\S]*?)(<\\/${tagName}>)`, 'gi');
  let matchIndex = 0;
  
  newHtml = newHtml.replace(regex, (match, openTag, content, closeTag) => {
    if (matchIndex === occurrenceIndex) {
      matchIndex++;
      
      // Atualizar href se for um link
      let updatedOpenTag = openTag;
      if (elementType === 'link' && newHref !== null) {
        updatedOpenTag = openTag.replace(/href=(["'])[^"']*\1/, `href="${newHref}"`);
      }
      
      // Atualizar texto (preservando HTML interno se houver)
      const updatedContent = content.trim() === originalText.trim() 
        ? newText 
        : content.replace(originalText, newText);
      
      return `${updatedOpenTag}${updatedContent}${closeTag}`;
    }
    matchIndex++;
    return match;
  });
  
  if (newHtml !== block.html) {
    updateBlockHtml(editingLinkContext.blockId, newHtml);
    toast.success('Link atualizado!');
  }
  
  setLinkEditorOpen(false);
  setEditingLinkContext(null);
}, [editingLinkContext, blocks, updateBlockHtml]);
```

### 1.3 Novo componente: LinkEditorModal

Criar modal simples para edição:

```tsx
// src/components/eficode/LinkEditorModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link, Type } from 'lucide-react';

interface LinkEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'link' | 'button';
  initialText: string;
  initialHref: string | null;
  onSave: (text: string, href: string | null) => void;
}

export const LinkEditorModal = ({ ... }) => {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref || '');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {elementType === 'link' ? 'Editar Link' : 'Editar Botão'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Texto</Label>
            <Input value={text} onChange={e => setText(e.target.value)} />
          </div>
          
          {elementType === 'link' && (
            <div>
              <Label>URL (href)</Label>
              <Input value={href} onChange={e => setHref(e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(text, elementType === 'link' ? href : null)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Parte 2: Scrollbar Elegante

### 2.1 Identificar o elemento com scroll

O elemento que cria a rolagem vertical é a `<main>` que envolve o iframe:

```tsx
<main className="flex-1 overflow-auto" ...>
```

### 2.2 Adicionar estilos de scrollbar customizada

Adicionar classes CSS no arquivo `src/index.css` ou diretamente no componente usando Tailwind:

```css
/* Scrollbar elegante para o editor */
.efi-code-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

.efi-code-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.efi-code-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.efi-code-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.4);
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.efi-code-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(155, 155, 155, 0.6);
}

.efi-code-scrollbar::-webkit-scrollbar-corner {
  background: transparent;
}
```

### 2.3 Aplicar a classe no EfiCodeEditor.tsx

```tsx
<main className="flex-1 overflow-auto efi-code-scrollbar" style={{...}}>
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Modificação |
|---------|------|-------------|
| `src/components/eficode/editor/UnifiedIframe.tsx` | Editar | Adicionar detecção de clique em links/botões, estilos hover verde |
| `src/pages/EfiCodeEditor.tsx` | Editar | Adicionar estados, handlers, importar modal, adicionar classe de scrollbar |
| `src/components/eficode/LinkEditorModal.tsx` | Criar | Novo modal para edição de texto e href |
| `src/index.css` | Editar | Adicionar estilos de scrollbar elegante |

---

## Experiência do Usuário

### Antes
- Clique em link/botão = nada acontece (apenas seleção de bloco)
- Scrollbar = aparência padrão do navegador

### Depois
- Clique em link/botão = abre modal para editar texto e URL
- Links têm outline verde no hover indicando que são editáveis
- Scrollbar = fina, arredondada, semi-transparente, elegante

---

## Indicadores Visuais

| Elemento | Cor do Outline no Hover |
|----------|-------------------------|
| Imagens | Roxo (#8b5cf6) |
| Links/Botões | Verde (#10b981) |
| Blocos | Azul (#3b82f6) para selecionado, cinza pontilhado para hover |

