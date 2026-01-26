
# Plano: Remover Background Branco do Container Root

## Problema Identificado

O Container ROOT está sendo deserializado do banco de dados com `background: "#ffffff"` (branco), que foi salvo anteriormente. Mesmo alterando o código para `background="transparent"`, os dados já salvos no banco ainda contêm o valor antigo.

## Solução

Implementar duas correções:

### 1. Forçar background transparente no Container ROOT durante deserialização

Modificar o `EditorFrame` para, após deserializar, atualizar o nó ROOT para ter background que herda das `pageSettings`:

```typescript
useEffect(() => {
  if (editorState) {
    try {
      actions.deserialize(editorState);
      
      // Forçar o ROOT a ter background transparente (herda das pageSettings)
      actions.setProp('ROOT', (props: any) => {
        props.background = 'transparent';
      });
    } catch (error) {
      console.error('[EfiCode] Erro ao restaurar estado:', error);
    }
  }
}, [editorState, actions]);
```

### 2. Garantir que novos sites tenham background transparente

O código atual já define `background="transparent"` para novos sites, então novos sites criados não terão esse problema.

### 3. (Opcional) Aplicar pageSettings.backgroundColor no Container ROOT

Se o usuário quiser que o Container ROOT herde a cor de fundo das configurações da página:

```typescript
// No EditorFrame, após deserializar:
actions.setProp('ROOT', (props: any) => {
  props.background = 'transparent'; // Deixa transparente para herdar do <main>
});
```

## Alteração no Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EfiCodeEditor.tsx` | Adicionar `actions.setProp('ROOT', ...)` após `actions.deserialize()` para forçar background transparente |

## Código Final (EditorFrame)

```typescript
function EditorFrame({ editorState }: { editorState: string | null }) {
  const { actions } = useEditor();

  useEffect(() => {
    if (editorState) {
      try {
        const parsed = JSON.parse(editorState);
        console.log('[EfiCode] Deserializando estado:', parsed);
        
        Object.entries(parsed).forEach(([nodeId, node]: [string, any]) => {
          if (node?.type?.resolvedName) {
            console.log(`[EfiCode] Node ${nodeId}: ${node.type.resolvedName}`);
          }
        });
        
        actions.deserialize(editorState);
        
        // Forçar ROOT a ter background transparente para herdar das pageSettings
        setTimeout(() => {
          actions.setProp('ROOT', (props: any) => {
            props.background = 'transparent';
          });
        }, 0);
      } catch (error) {
        console.error('[EfiCode] Erro ao restaurar estado:', error);
      }
    }
  }, [editorState, actions]);

  return (
    <Frame>
      <Element
        is={Container}
        canvas
        background="transparent"
        padding={0}
        minHeight={400}
      />
    </Frame>
  );
}
```

## Fluxo Visual

```text
ANTES:
┌────────────────────────────────────────────┐
│     <main> backgroundColor: #161616        │
│  ┌──────────────────────────────────────┐  │
│  │    Container ROOT: #ffffff (branco)  │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │    HtmlBlock (conteúdo ok)     │  │  │
│  │  └────────────────────────────────┘  │  │
│  │         ← área branca visível        │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘

DEPOIS:
┌────────────────────────────────────────────┐
│     <main> backgroundColor: #161616        │
│  ┌──────────────────────────────────────┐  │
│  │  Container ROOT: transparent         │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │    HtmlBlock (conteúdo ok)     │  │  │
│  │  └────────────────────────────────┘  │  │
│  │  ← herda cor #161616 do <main>       │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

## Por que usar setTimeout?

O `setTimeout(..., 0)` é necessário porque o `actions.deserialize()` pode ser assíncrono internamente. Executar o `setProp` no próximo tick garante que a árvore de nós já foi completamente restaurada antes de modificar o ROOT.

## Considerações

- **Dados existentes**: Sites salvos anteriormente serão corrigidos automaticamente ao abrir o editor
- **Novos sites**: Já serão criados com `background="transparent"`
- **Exportação HTML**: A exportação deve continuar funcionando, pois o `generateFullHtml` usa as `pageSettings` para o background do body
