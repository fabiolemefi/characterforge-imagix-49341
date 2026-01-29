

# Plano: Corrigir Edição Inline e Restaurar Edição de Propriedades

## Problemas Identificados

### 1. Erro de Build
O arquivo `src/components/brandguide/InlineTextEditor.tsx` ainda importa `react-contenteditable` que foi removido das dependências.

### 2. Double-click Seleciona Todo Conteúdo
No script do iframe, após ativar o modo de edição, o código seleciona todo o conteúdo do bloco:
```javascript
range.selectNodeContents(block);
selection.removeAllRanges();
selection.addRange(range);
```
Isso causa o comportamento indesejado de selecionar tudo.

### 3. Sem Indicação Visual de Modo de Edição
O bloco em modo de edição deveria ter uma indicação mais clara (borda laranja existe mas pode não ser suficiente).

### 4. Edição de Propriedades (Imagens) Perdida
O `SettingsPanel` foi simplificado e perdeu a funcionalidade de editar imagens. A implementação original permitia:
- Clicar em imagens dentro do bloco para substituí-las
- Selecionar imagens da biblioteca via `ImagePickerModal`

## Solução Proposta

### Parte 1: Corrigir Erro de Build

Refatorar `InlineTextEditor.tsx` para não usar `react-contenteditable`, usando `contentEditable` nativo do React.

### Parte 2: Melhorar Experiência de Edição Inline

1. **Remover seleção automática de todo conteúdo** - Em vez de selecionar tudo, apenas posicionar o cursor no ponto clicado
2. **Adicionar indicação visual clara** - Banner/overlay indicando "Modo de Edição" com instrução de como sair (ESC ou clicar fora)
3. **Feedback visual melhorado** - Borda laranja mais proeminente + ícone de edição

### Parte 3: Restaurar Edição de Propriedades

Criar um novo `SettingsPanel` completo que inclui:

1. **Detecção de imagens no bloco** - Parsear o HTML e extrair todas as `<img>` tags
2. **Lista de imagens editáveis** - Exibir thumbnails das imagens com botão de trocar
3. **Integração com ImagePickerModal** - Abrir modal para selecionar nova imagem
4. **Atualização do HTML** - Substituir a URL da imagem no HTML do bloco

---

## Implementação Detalhada

### Arquivo 1: `src/components/brandguide/InlineTextEditor.tsx`

Refatorar para usar `contentEditable` nativo:

```typescript
// Substituir:
import ContentEditable from 'react-contenteditable';

// Por implementação nativa com useRef e dangerouslySetInnerHTML
```

### Arquivo 2: `src/components/eficode/editor/UnifiedIframe.tsx`

Modificar o script do iframe:

```javascript
// ANTES (linha 173-179):
block.focus();
const selection = window.getSelection();
const range = document.createRange();
range.selectNodeContents(block);
selection.removeAllRanges();
selection.addRange(range);

// DEPOIS:
block.focus({ preventScroll: true });
// Não selecionar automaticamente - deixar cursor onde o usuário clicou
```

Adicionar indicador visual de modo de edição:

```javascript
// No script, ao entrar em modo de edição:
const indicator = document.createElement('div');
indicator.id = 'edit-mode-indicator';
indicator.innerHTML = '✏️ Modo de Edição • Pressione ESC para sair';
indicator.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);...';
document.body.appendChild(indicator);
```

### Arquivo 3: `src/components/eficode/editor/SettingsPanel.tsx`

Expandir com edição de propriedades:

```typescript
interface BlockImage {
  index: number;
  src: string;
  alt: string;
}

// Parsear imagens do HTML
const extractImages = (html: string): BlockImage[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');
  return Array.from(imgs).map((img, i) => ({
    index: i,
    src: img.src,
    alt: img.alt || ''
  }));
};

// Substituir imagem no HTML
const replaceImage = (html: string, index: number, newSrc: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');
  if (imgs[index]) {
    imgs[index].src = newSrc;
  }
  return doc.body.innerHTML;
};
```

UI do painel expandido:
- Seção "Imagens do Bloco" com thumbnails
- Botão "Trocar" que abre `ImagePickerModal`
- Botão "Editar HTML" que abre modal com código

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/brandguide/InlineTextEditor.tsx` | Remover import de `react-contenteditable`, usar `contentEditable` nativo |
| `src/components/eficode/editor/UnifiedIframe.tsx` | Remover seleção automática, adicionar indicador visual de edição |
| `src/components/eficode/editor/SettingsPanel.tsx` | Adicionar extração e edição de imagens do bloco |
| `src/pages/EfiCodeEditor.tsx` | Passar `updateBlockHtml` para o SettingsPanel |

---

## Fluxo de Interação Melhorado

### Edição de Texto (Inline)

```text
1. Usuário clica no bloco → Bloco selecionado (borda azul)
2. Usuário clica novamente/duplo clique → Modo edição ativado
   - Borda laranja
   - Banner "Modo de Edição" aparece no topo
   - Cursor posicionado onde clicou (sem selecionar tudo)
3. Usuário edita o texto
4. ESC ou clique fora → Salva e sai do modo edição
```

### Edição de Imagem (Via Painel)

```text
1. Usuário clica no bloco → Bloco selecionado
2. Painel lateral mostra:
   - Informações do bloco
   - Lista de imagens do bloco (thumbnails)
3. Usuário clica "Trocar" em uma imagem
4. ImagePickerModal abre
5. Usuário seleciona nova imagem
6. HTML do bloco é atualizado com nova URL
```

---

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Double-click | Seleciona tudo | Posiciona cursor |
| Indicação de edição | Apenas borda | Borda + banner informativo |
| Edição de imagens | Perdida | Restaurada via painel lateral |
| Build | Falha (react-contenteditable) | Funciona |

