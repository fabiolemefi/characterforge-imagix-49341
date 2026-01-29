
# Plano: Corrigir Atualização de Imagens no Bloco

## Problema Identificado

Quando o usuário substitui uma imagem através do painel de propriedades (Settings), a mudança é salva no Craft.js via `setProp`, mas o componente `HtmlBlock` não está refletindo essa mudança visualmente no iframe.

### Fluxo Atual (com bug)

```text
┌─────────────────────────────────────────────────────────────┐
│ HtmlBlockSettings: handleReplaceImage                       │
│ └─ setProp → props.htmlTemplate = newTemplate               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ HtmlBlock: useNode observa state.data.props.htmlTemplate    │
│ └─ html e htmlTemplate são extraídos                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: O Craft.js pode não estar notificando mudança     │
│ porque o selector retorna objetos sem identidade estável    │
└─────────────────────────────────────────────────────────────┘
```

### Causa Raiz

O `useNode` está retornando valores primitivos (`html`, `htmlTemplate`) mas o Craft.js pode não estar detectando a mudança corretamente quando:

1. O selector cria novos objetos a cada render (identity mismatch)
2. O Craft.js compara por referência, não por valor
3. O componente não re-renderiza porque React memo/referências não mudam

## Solução

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

#### Alteração 1: Usar `nodeProps` completo em vez de selecionar valores específicos

O problema é que estamos selecionando apenas `html` e `htmlTemplate` de `state.data.props`, mas o Craft.js pode não estar detectando mudanças nesses valores primitivos corretamente. Vamos usar o spread do `props` completo:

**Antes (linha 303-316):**
```tsx
export const HtmlBlock = ({ className = '' }: HtmlBlockProps) => {
  const { 
    connectors: { connect, drag }, 
    selected, 
    actions: { setProp }, 
    id,
    html,
    htmlTemplate 
  } = useNode((state) => ({
    selected: state.events.selected,
    html: state.data.props.html,
    htmlTemplate: state.data.props.htmlTemplate,
  }));
```

**Depois:**
```tsx
export const HtmlBlock = ({ className = '' }: HtmlBlockProps) => {
  const { 
    connectors: { connect, drag }, 
    selected, 
    actions: { setProp }, 
    id,
    props: nodeProps
  } = useNode((state) => ({
    selected: state.events.selected,
    props: state.data.props,
  }));
  
  // Extrair valores diretamente de nodeProps para garantir reatividade
  const html = nodeProps?.html;
  const htmlTemplate = nodeProps?.htmlTemplate;
```

#### Alteração 2: Adicionar key no IframePreview para forçar recriação

Para garantir que o iframe seja recriado quando o template muda (especialmente para imagens), vamos adicionar uma key baseada em um hash ou timestamp do template:

**Na renderização do IframePreview (linha 437-444):**
```tsx
<IframePreview
  key={template} // Forçar recriação quando template muda
  html={template}
  editable={isEditing}
  onClick={handleContainerClick}
  onHtmlChange={handleIframeHtmlChange}
  onEditEnd={handleIframeEditEnd}
  minHeight={0}
/>
```

**Nota:** Usar `template` como key pode ser ineficiente para HTML muito grande. Alternativa com hash:

```tsx
// Criar hash simples para key
const templateKey = useMemo(() => {
  let hash = 0;
  for (let i = 0; i < template.length; i++) {
    const char = template.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}, [template]);

// No render
<IframePreview
  key={templateKey}
  html={template}
  ...
/>
```

## Diagrama do Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│ HtmlBlockSettings: handleReplaceImage                       │
│ └─ setProp → props.htmlTemplate = newTemplate               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ HtmlBlock: useNode observa state.data.props (objeto inteiro)│
│ └─ nodeProps muda → html/htmlTemplate são extraídos         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ template muda → templateKey muda → IframePreview recria     │
│ └─ Novo srcdoc gerado com a nova URL de imagem              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Iframe exibe a nova imagem corretamente                     │
└─────────────────────────────────────────────────────────────┘
```

## Resumo de Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | 303-323 | Mudar useNode para observar `state.data.props` inteiro e extrair valores depois |
| `HtmlBlock.tsx` | 320-326 | Adicionar `templateKey` com hash simples para key do IframePreview |
| `HtmlBlock.tsx` | 437 | Adicionar `key={templateKey}` no IframePreview |

## Código Final

```tsx
export const HtmlBlock = ({ className = '' }: HtmlBlockProps) => {
  const { 
    connectors: { connect, drag }, 
    selected, 
    actions: { setProp }, 
    id,
    props: nodeProps
  } = useNode((state) => ({
    selected: state.events.selected,
    props: state.data.props,
  }));
  const { enabled, actions: editorActions } = useEditor((state) => ({ 
    enabled: state.options.enabled 
  }));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Extrair valores de nodeProps para reatividade correta
  const html = nodeProps?.html;
  const htmlTemplate = nodeProps?.htmlTemplate;
  const template = htmlTemplate || html || '';
  
  // Key estável baseada em hash do template para forçar recriação do iframe
  const templateKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }, [template]);
  
  // ... resto do código ...
  
  return (
    <div
      ref={(ref) => {
        if (ref && enabled) {
          connect(drag(ref));
        }
      }}
      className={`relative w-full ${className}`}
      style={{ boxShadow: enabled && selected ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none' }}
    >
      <IframePreview
        key={templateKey}
        html={template}
        editable={isEditing}
        onClick={handleContainerClick}
        onHtmlChange={handleIframeHtmlChange}
        onEditEnd={handleIframeEditEnd}
        minHeight={0}
      />
    </div>
  );
};
```
