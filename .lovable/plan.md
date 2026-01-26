

# Plano: Opções para Edição de Texto com Isolamento CSS

## Situação Atual

O `HtmlBlock` agora usa `IframePreview` para garantir isolamento CSS, mas isso removeu a capacidade de edição inline. Precisamos de uma solução que permita editar textos mantendo o isolamento.

## Opções Disponíveis

| Opção | Descrição | Prós | Contras |
|-------|-----------|------|---------|
| **A: Edição via Painel Settings** | Melhorar o Textarea existente no painel lateral | Já funciona, simples | Não é WYSIWYG, precisa editar HTML |
| **B: Edição DENTRO do Iframe** | Injetar `contenteditable` no iframe e comunicar mudanças via `postMessage` | Mantém isolamento CSS + edição visual | Mais complexo, precisa sincronizar |
| **C: Modal de Edição Visual** | Ao clicar, abre modal com preview isolado + editor de texto rico | UX clara, isolamento garantido | Mais cliques para editar |

## Recomendação: Opção B - Edição dentro do Iframe

Esta é a solução mais elegante pois:
1. Mantém isolamento CSS total (estilos aparecem corretos durante edição)
2. Permite edição visual inline (WYSIWYG)
3. Usa `postMessage` para comunicar mudanças do iframe para o React

### Fluxo da Edição

```text
1. Usuário clica no bloco
   → Bloco é selecionado (ring azul)
   
2. Usuário clica novamente (ou duplo-clique)
   → Iframe recebe mensagem para ativar contenteditable
   → Usuário edita texto visualmente DENTRO do iframe
   
3. Usuário clica fora ou pressiona Escape
   → Iframe envia HTML atualizado via postMessage
   → React atualiza o htmlTemplate com o novo conteúdo
```

### Implementação Técnica

#### 1. Modificar `IframePreview.tsx`

Adicionar suporte a modo editável:

```typescript
interface IframePreviewProps {
  html: string;
  className?: string;
  onClick?: () => void;
  minHeight?: number;
  editable?: boolean;              // NOVO: ativa contenteditable
  onHtmlChange?: (html: string) => void;  // NOVO: callback quando HTML muda
}
```

Injetar script no iframe que:
- Adiciona `contenteditable="true"` ao body quando `editable=true`
- Escuta eventos de input e envia HTML atualizado via `postMessage`
- Escuta mensagem para ativar/desativar modo de edição

```javascript
// Script injetado no iframe
if (window.editableMode) {
  document.body.contentEditable = 'true';
  document.body.style.outline = 'none';
  
  document.body.addEventListener('input', () => {
    window.parent.postMessage({
      type: 'eficode-html-change',
      html: document.body.innerHTML
    }, '*');
  });
  
  document.body.addEventListener('blur', () => {
    window.parent.postMessage({
      type: 'eficode-edit-end',
      html: document.body.innerHTML
    }, '*');
  });
}
```

#### 2. Modificar `HtmlBlock.tsx`

Adicionar estado de edição e handlers:

```typescript
const [isEditing, setIsEditing] = useState(false);

// Handler quando clica no bloco já selecionado
const handleIframeClick = () => {
  if (enabled && selected && !isEditing) {
    setIsEditing(true);
  }
};

// Handler quando HTML é alterado dentro do iframe
const handleHtmlChange = (newHtml: string) => {
  setProp((props: any) => {
    props.htmlTemplate = newHtml;
    props.html = newHtml;
  });
};

// Desativar edição quando desseleciona
useEffect(() => {
  if (!selected) setIsEditing(false);
}, [selected]);

return (
  <div ref={...} className={...}>
    <IframePreview 
      html={template}
      editable={isEditing}
      onHtmlChange={handleHtmlChange}
      onClick={handleIframeClick}
    />
  </div>
);
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/IframePreview.tsx` | Adicionar props `editable` e `onHtmlChange`, injetar lógica de contenteditable |
| `src/components/eficode/user-components/HtmlBlock.tsx` | Gerenciar estado de edição, passar props para IframePreview |

### Diagrama Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                      MODO VISUALIZAÇÃO                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  IframePreview (editable=false)                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  HTML renderizado com CSS isolado              │  │  │
│  │  │  (não editável, apenas visualização)           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓ clique (quando selecionado)       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      MODO EDIÇÃO                       │  │
│  │  IframePreview (editable=true)                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  body.contentEditable = true                   │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │ Texto editável com estilos corretos! ✓   │  │  │  │
│  │  │  │ Cursor piscando, pode digitar            │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  │                                                 │  │  │
│  │  │  → onInput: postMessage({ html: innerHTML })   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓ blur/click fora                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Volta para MODO VISUALIZAÇÃO                         │  │
│  │  htmlTemplate atualizado com as edições              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Considerações

1. **Sincronização**: As mudanças são enviadas em tempo real via `postMessage`, atualizando o Craft.js state
2. **Performance**: O `input` event pode disparar muito, considerar debounce se necessário
3. **Foco**: Quando `editable=true`, o iframe precisa receber foco automaticamente
4. **Escape**: Pressionar Escape deve sair do modo de edição

### Complexidade

Esta implementação é moderadamente complexa mas oferece a melhor experiência de usuário:
- Edição visual inline com estilos corretos
- Não precisa sair do canvas para editar
- Mantém 100% de isolamento CSS

