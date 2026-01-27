
# Plano: Abordagem Alternativa sem Iframe para HtmlBlock

## Problema Atual

O HtmlBlock usa um `<iframe>` com `srcdoc` para:
1. **Isolar CSS** - Evitar conflitos entre Tailwind v3 (app) e Tailwind v4 (blocos importados)
2. **Edição contentEditable** - Permitir edição visual do HTML

### Por que o Flickering Persiste

```text
┌─────────────────────────────────────────────────────────────┐
│  O problema fundamental é que o iframe recria o srcdoc     │
│  sempre que a prop "editable" muda de false → true.        │
│                                                             │
│  Mesmo com o "lock" do HTML, a mudança de EDITABLE_MODE    │
│  força uma reconstrução completa do documento iframe:      │
│                                                             │
│  - srcdoc depende de [globalCss, stableHtml, editable]     │
│  - Quando editable muda, o useMemo recalcula               │
│  - Navegador re-renderiza todo o iframe = FLASH            │
└─────────────────────────────────────────────────────────────┘
```

## Solução Proposta: Renderização Direta com CSS Global

Em vez de usar iframe, renderizar o HTML diretamente no DOM principal usando `dangerouslySetInnerHTML` e aproveitar o CSS global que já é injetado no viewport do editor.

### Vantagens desta Abordagem

| Aspecto | Iframe (Atual) | Renderização Direta (Proposta) |
|---------|----------------|--------------------------------|
| Flickering | Sim (recria documento) | Não (atualização DOM normal) |
| Edição | Via postMessage | Direta via contentEditable |
| Performance | Pesado (documento completo) | Leve (elementos React) |
| CSS | Isolado no iframe | Usa CSS global já injetado |

### Possível Conflito de CSS

O motivo original do iframe era isolar Tailwind v4 do v3. **Porém**, o `EfiCodeEditor.tsx` já injeta o `globalCss` (Tailwind v4) no viewport:

```typescript
// EfiCodeEditor.tsx linha 172-174
<style dangerouslySetInnerHTML={{
  __html: globalCss
}} />
```

Isso significa que os blocos HTML **já podem usar** as classes do CSS global se renderizados diretamente. O Tailwind v4 tem classes com nomes diferentes (ex: `bg-elevation-2`) que não conflitam com Tailwind v3 (`bg-gray-100`).

## Implementação

### Novo Componente: DirectHtmlBlock

Criar um componente alternativo que renderiza HTML diretamente:

```typescript
// Estrutura simplificada
export const DirectHtmlBlock = ({ htmlTemplate }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Renderização direta - sem iframe
  return (
    <div
      ref={containerRef}
      contentEditable={isEditing}
      dangerouslySetInnerHTML={{ __html: htmlTemplate }}
      onBlur={() => {
        // Salvar HTML do container
        const newHtml = containerRef.current?.innerHTML || '';
        setProp(props => { props.htmlTemplate = newHtml; });
        setIsEditing(false);
      }}
      onClick={() => setIsEditing(true)}
    />
  );
};
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | Substituir IframePreview por renderização direta |

### Código Proposto para HtmlBlock.tsx

```typescript
export const HtmlBlock = ({ html, htmlTemplate, className = '' }: HtmlBlockProps) => {
  const { connectors: { connect, drag }, selected, actions: { setProp } } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const template = htmlTemplate || html || '';
  
  // Handler para iniciar edição
  const handleClick = useCallback(() => {
    if (enabled && selected && !isEditing) {
      setIsEditing(true);
    }
  }, [enabled, selected, isEditing]);

  // Handler para finalizar edição
  const handleBlur = useCallback(() => {
    if (isEditing && containerRef.current) {
      const newHtml = normalizeHtml(containerRef.current.innerHTML);
      const currentNormalized = normalizeHtml(template);
      
      if (newHtml !== currentNormalized) {
        setProp((props: any) => {
          props.htmlTemplate = newHtml;
          props.html = newHtml;
        });
      }
    }
    setIsEditing(false);
  }, [isEditing, template, setProp]);

  // Desativar edição quando desseleciona
  useEffect(() => {
    if (!selected) setIsEditing(false);
  }, [selected]);

  return (
    <div
      ref={(ref) => {
        if (ref && enabled) connect(drag(ref));
      }}
      className={`relative ${className} ${enabled && selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <div
        ref={containerRef}
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{ __html: template }}
        onClick={handleClick}
        onBlur={handleBlur}
        className={isEditing ? 'outline-2 outline-primary outline-offset-2' : ''}
        style={{ cursor: isEditing ? 'text' : 'pointer' }}
      />
    </div>
  );
};
```

## Fluxo de Edição Simplificado

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário clica no bloco                                   │
│    → setIsEditing(true)                                     │
│    → contentEditable="true" é aplicado                      │
│    → SEM recriação de DOM, apenas atributo muda             │
├─────────────────────────────────────────────────────────────┤
│ 2. Usuário edita texto/conteúdo                             │
│    → Edição acontece diretamente no DOM                     │
│    → Nenhum estado React é atualizado durante edição        │
├─────────────────────────────────────────────────────────────┤
│ 3. Usuário clica fora (blur)                                │
│    → Captura innerHTML do container                         │
│    → Normaliza e compara com original                       │
│    → Se mudou, atualiza props do Craft.js                   │
│    → setIsEditing(false)                                    │
└─────────────────────────────────────────────────────────────┘
```

## Considerações Importantes

### CSS Global Necessário

Para esta abordagem funcionar, o campo `global_css` no banco de dados **deve conter** o CSS do Tailwind v4 (ou qualquer CSS que os blocos importados usam). Isso já deve estar configurado.

### Possíveis Conflitos

Se classes de Tailwind v4 tiverem nomes idênticos às de Tailwind v3, pode haver conflitos. Na prática, classes customizadas como `bg-elevation-2`, `text-base-medium` são únicas e não conflitam.

### Vantagem para Imagens

Com renderização direta, as imagens usam o mesmo contexto de carregamento do app principal, eliminando problemas de carregamento que podem ocorrer em iframes.

## Resultado Esperado

- Sem flickering ao alternar entre edição e visualização
- Edição direta e responsiva de textos e imagens
- CSS global interpretado corretamente pelo navegador
- Performance melhorada sem overhead de iframes
