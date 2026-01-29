
# Plano: Correções no Editor Efi Code

## Problemas a Resolver

1. **Tema padrão deve ser "dark"**: Atualmente o tema inicia como "light", mas o usuário quer que "dark" seja o padrão.

2. **Troca de ícone em botão não funciona**: Quando o usuário clica em "Trocar Ícone" no modal de link/botão, a imagem não é substituída corretamente porque o `occurrenceIndex` passado é do link, não da imagem interna.

---

## Solução

### Parte 1: Tema Padrão Dark

Alterar o valor inicial do estado `themeMode` de `'light'` para `'dark'`.

**Arquivo**: `src/pages/EfiCodeEditor.tsx`

```typescript
// Antes
const [themeMode, setThemeMode] = useState<ThemeMode>('light');

// Depois
const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
```

---

### Parte 2: Corrigir Índice de Ocorrência para Ícones

O problema está no cálculo do `occurrenceIndex` da imagem interna. Atualmente:

1. O iframe detecta que um link tem uma imagem interna (`hasInnerImage: true`)
2. Envia `innerImageSrc` mas usa o `occurrenceIndex` do **link**
3. Quando o usuário clica em "Trocar Ícone", esse índice errado é passado para `handleImageSelect`
4. O `handleImageSelect` procura a N-ésima ocorrência da imagem, mas usa o índice do link

**Correção**: Calcular um `innerImageOccurrenceIndex` específico para a imagem interna do link.

#### No UnifiedIframe.tsx

Ao detectar um link com imagem interna, calcular o índice correto da imagem:

```javascript
// Check for inner images/icons
const innerImg = element.querySelector('img');
const innerSvg = element.querySelector('svg');
const hasInnerImage = !!innerImg || !!innerSvg;
const innerImageSrc = innerImg ? innerImg.getAttribute('src') : null;

// Calculate the CORRECT occurrence index for the inner image
let innerImageOccurrenceIndex = 0;
if (innerImg && innerImageSrc) {
  const allImgs = Array.from(block.querySelectorAll('img'));
  const sameSourceImgs = allImgs.filter(function(i) {
    return i.getAttribute('src') === innerImageSrc;
  });
  innerImageOccurrenceIndex = sameSourceImgs.indexOf(innerImg);
}

window.parent.postMessage({
  type: 'eficode-link-click',
  // ... outros campos ...
  hasInnerImage: hasInnerImage,
  innerImageSrc: innerImageSrc,
  innerImageOccurrenceIndex: innerImageOccurrenceIndex  // NOVO
}, '*');
```

#### No EfiCodeEditor.tsx

1. Expandir `editingLinkContext` para incluir `innerImageOccurrenceIndex`
2. Em `handleLinkClick`, capturar o novo campo
3. Em `handleLinkImageChange`, usar `innerImageOccurrenceIndex` em vez de `occurrenceIndex`

```typescript
// Estado expandido
const [editingLinkContext, setEditingLinkContext] = useState<{
  // ... campos existentes ...
  innerImageOccurrenceIndex?: number;  // NOVO
} | null>(null);

// Em handleLinkImageChange
setEditingImageContext({
  blockId: editingLinkContext.blockId,
  imageSrc: editingLinkContext.innerImageSrc || '',
  isPicture: false,
  occurrenceIndex: editingLinkContext.innerImageOccurrenceIndex ?? 0  // Usar índice correto
});
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/EfiCodeEditor.tsx` | Mudar tema padrão para 'dark', adicionar `innerImageOccurrenceIndex` ao contexto |
| `src/components/eficode/editor/UnifiedIframe.tsx` | Calcular e enviar `innerImageOccurrenceIndex` |

---

## Resultado Esperado

1. Ao abrir o editor, o tema já estará em modo escuro
2. Ao clicar em "Trocar Ícone" em um botão com ícone, a imagem correta será substituída
