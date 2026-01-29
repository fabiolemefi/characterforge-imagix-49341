
# Plano: Melhorias no Editor de Links/Botões

## Problemas Identificados

1. **Botão mostra apenas campo de texto**: O modal `LinkEditorModal` está configurado para esconder o campo de URL quando `elementType === 'button'`, mas botões em HTML muitas vezes também têm links (via tags `<a>` que envolvem botões ou atributos data)

2. **Modal fecha antes de mostrar campo de link**: Possivelmente o estado `editingLinkContext` não está sendo passado corretamente ao modal, ou o modal recebe valores antes de atualizar seu estado interno

3. **Falta suporte para editar SVGs dentro de botões/links**: Quando um botão contém um ícone SVG, o usuário não consegue trocar esse SVG por outro da biblioteca

4. **Falta opção de target para links**: O usuário precisa escolher se o link abre na mesma página (`_self`) ou em nova aba (`_blank`)

---

## Solução Proposta

### Parte 1: Corrigir o Modal para Botões

Permitir que botões também tenham campo de URL (href), já que muitos botões são na verdade `<a>` estilizados como botões. Também adicionar a opção de target.

### Parte 2: Adicionar Seletor de Target

Adicionar um `Select` ou `RadioGroup` para escolher entre:
- "Mesma janela" (`_self`)
- "Nova janela" (`_blank`)

### Parte 3: Detectar e Permitir Troca de SVGs/Ícones

Quando o elemento clicado contém um `<img>` ou `<svg>` interno, permitir que o usuário troque esse ícone abrindo o ImagePickerModal.

---

## Mudanças Técnicas

### 1. LinkEditorModal.tsx - Expandir Funcionalidades

Modificar interface para incluir:

```typescript
interface LinkEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'link' | 'button';
  initialText: string;
  initialHref: string | null;
  initialTarget: string | null;  // NOVO
  hasInnerImage: boolean;        // NOVO
  innerImageSrc: string | null;  // NOVO
  onSave: (text: string, href: string | null, target: string | null) => void;
  onChangeImage: () => void;     // NOVO - abre modal de imagens
}
```

Adicionar:
- Campo de URL para todos os tipos (link e button)
- Select para escolher target (`_self` ou `_blank`)
- Botão "Trocar Ícone" quando há imagem/SVG interno

### 2. UnifiedIframe.tsx - Detectar Imagens Internas

Modificar a lógica de clique em links/botões para também capturar:
- Se há `<img>` dentro do elemento
- Se há `<svg>` dentro (converter para boolean `hasSvg`)
- O `src` da imagem interna se existir

```javascript
const innerImg = element.querySelector('img');
const innerSvg = element.querySelector('svg');
const hasInnerImage = !!innerImg || !!innerSvg;
const innerImageSrc = innerImg ? innerImg.getAttribute('src') : null;

window.parent.postMessage({
  type: 'eficode-link-click',
  blockId: blockId,
  elementType: elementType,
  href: href,
  text: text,
  target: element.getAttribute('target'),  // NOVO
  occurrenceIndex: occurrenceIndex,
  hasInnerImage: hasInnerImage,             // NOVO
  innerImageSrc: innerImageSrc              // NOVO
}, '*');
```

### 3. EfiCodeEditor.tsx - Atualizar Context e Handlers

Expandir `editingLinkContext`:

```typescript
const [editingLinkContext, setEditingLinkContext] = useState<{
  blockId: string;
  elementType: 'link' | 'button';
  href: string | null;
  text: string;
  target: string | null;         // NOVO
  occurrenceIndex: number;
  hasInnerImage: boolean;        // NOVO
  innerImageSrc: string | null;  // NOVO
} | null>(null);
```

Modificar `handleLinkSave` para:
- Aceitar `target` como parâmetro
- Atualizar/adicionar atributo `target` no HTML

```typescript
const handleLinkSave = useCallback((
  newText: string, 
  newHref: string | null, 
  newTarget: string | null
) => {
  // ... lógica existente ...
  
  // Atualizar target
  if (newTarget) {
    if (openTag.includes('target=')) {
      updatedOpenTag = updatedOpenTag.replace(/target=(["'])[^"']*\1/, `target="${newTarget}"`);
    } else {
      updatedOpenTag = updatedOpenTag.replace(/>$/, ` target="${newTarget}">`);
    }
  } else {
    // Remover target se for null
    updatedOpenTag = updatedOpenTag.replace(/\s*target=(["'])[^"']*\1/, '');
  }
  
  // ...
}, [...]);
```

Adicionar handler para trocar imagem interna:

```typescript
const handleLinkImageChange = useCallback(() => {
  if (editingLinkContext?.hasInnerImage) {
    // Fechar modal de link
    setLinkEditorOpen(false);
    
    // Abrir modal de imagem com contexto do link
    setEditingImageContext({
      blockId: editingLinkContext.blockId,
      imageSrc: editingLinkContext.innerImageSrc || '',
      isPicture: false,
      occurrenceIndex: editingLinkContext.occurrenceIndex
    });
    setImagePickerOpen(true);
  }
}, [editingLinkContext]);
```

---

## Interface do Modal Atualizada

```text
┌─────────────────────────────────────────┐
│ 🔗 Editar Link                          │
├─────────────────────────────────────────┤
│                                         │
│ Texto                                   │
│ ┌─────────────────────────────────────┐ │
│ │ Saiba mais                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ URL (href)                              │
│ ┌─────────────────────────────────────┐ │
│ │ https://exemplo.com                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Abrir em                                │
│ ┌─────────────────────────────────────┐ │
│ │ Nova janela                       ▼ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🖼️ Trocar Ícone                     │ │ (só aparece se tem imagem/svg)
│ └─────────────────────────────────────┘ │
│                                         │
│                    [Cancelar] [Salvar]  │
└─────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/LinkEditorModal.tsx` | Adicionar campo href para botões, select de target, botão trocar ícone |
| `src/components/eficode/editor/UnifiedIframe.tsx` | Enviar `target`, `hasInnerImage`, `innerImageSrc` na mensagem |
| `src/pages/EfiCodeEditor.tsx` | Expandir context, atualizar handlers, adicionar handler para troca de imagem |

---

## Casos de Uso

| Cenário | Comportamento |
|---------|---------------|
| Link simples | Edita texto, URL e target |
| Link com ícone | Edita texto, URL, target + botão para trocar ícone |
| Botão (tag a estilizada) | Edita texto, URL e target (mesmo comportamento de link) |
| Botão com SVG | Edita texto, URL, target + botão para trocar SVG |
| Link abrindo em nova aba | Select mostra "Nova janela", salva com `target="_blank"` |
| Link abrindo na mesma | Select mostra "Mesma janela", remove atributo target |
