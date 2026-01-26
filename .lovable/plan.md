
# Plano: Corrigir Renderização de Estilos Customizados no Efi Code

## Problema Identificado

O HTML do bloco "Página NPS" usa classes do Tailwind v4 do design system Efí Bank (`size-40`, `grid-cols-11`, `bg-elevation-*`, `text-base-medium`, etc.), mas o editor do Efi Code roda dentro do ambiente React do Lovable que usa Tailwind v3 com outras configurações.

### Comparação Visual

| Aspecto | Original (funciona) | Editor (quebrado) |
|---------|---------------------|-------------------|
| Grid NPS | 11 colunas (0-10 em linha) | 4 colunas (4x3 grid) |
| Botões | `size-40` (40x40px círculos) | Sem tamanho definido |
| Cores | `bg-elevation-*` aplicadas | Sem background |
| Texto | `text-base-medium` com cor | Cor padrão do Lovable |
| "Obrigatória" | Visível com `text-base-high` | Sem destaque |

### Causa Raiz

1. O Global CSS do Efi Code contém apenas o "reset" do Tailwind v4, não as classes utilitárias completas
2. O CSS do Lovable (`src/index.css`) está interferindo com variáveis CSS conflitantes
3. Classes como `grid-cols-11` e `size-40` não existem no Tailwind padrão e precisam de definições explícitas

## Solução Proposta

Isolar completamente os estilos do viewport do Efi Code usando um iframe ou escopo CSS forte.

### Opção A: Renderizar o HtmlBlock em um iframe (Recomendada)

Criar um componente que renderiza o conteúdo HTML em um iframe isolado com o Global CSS injetado, eliminando conflitos.

```text
ANTES:
┌─────────────────────────────────────┐
│ React App (Tailwind v3 Lovable)    │
│  ┌───────────────────────────────┐  │
│  │ <style>{globalCss}</style>    │  │ ← Conflita com index.css
│  │ <div dangerouslySetInnerHTML> │  │
│  │    ... HTML com classes v4    │  │ ← Classes não reconhecidas
│  │ </div>                        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────┐
│ React App (Tailwind v3 Lovable)    │
│  ┌───────────────────────────────┐  │
│  │ <iframe srcdoc="...">         │  │ ← Contexto CSS isolado
│  │   <html>                      │  │
│  │     <style>{globalCss}</style>│  │
│  │     <body>                    │  │
│  │       ... HTML com classes v4 │  │ ← Funciona corretamente!
│  │     </body>                   │  │
│  │   </html>                     │  │
│  │ </iframe>                     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Opção B: CSS Scoping com Shadow DOM

Usar Shadow DOM para isolar estilos, mas mantendo interatividade do Craft.js.

### Opção C: Prefixar todas as classes do Global CSS

Modificar o processamento do Global CSS para adicionar um escopo/prefixo a todas as regras.

## Implementação (Opção A - Iframe)

### Modificações Necessárias

#### 1. Criar componente `HtmlBlockPreview` para visualização em iframe

```typescript
// src/components/eficode/user-components/HtmlBlockPreview.tsx

interface HtmlBlockPreviewProps {
  html: string;
  globalCss: string;
  onSelect?: () => void;
}

export const HtmlBlockPreview = ({ html, globalCss, onSelect }: HtmlBlockPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const srcdoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; }
        ${globalCss}
      </style>
    </head>
    <body>${html}</body>
    </html>
  `;
  
  return (
    <iframe
      ref={iframeRef}
      srcdoc={srcdoc}
      className="w-full border-0"
      style={{ minHeight: '200px' }}
      onClick={onSelect}
    />
  );
};
```

#### 2. Modificar `HtmlBlock` para usar preview iframe quando não estiver editando

O `HtmlBlock` usará:
- **Modo visualização**: Iframe com CSS isolado para renderização fiel
- **Modo edição**: ContentEditable atual para permitir edição inline

```typescript
// Em HtmlBlock.tsx
if (!enabled) {
  // Modo preview/read-only - usar iframe para isolamento total
  return <HtmlBlockPreview html={template} globalCss={globalCss} />;
}

// Modo edição - usar ContentEditable atual
return (
  <div ref={...} className={...}>
    <ContentEditable ... />
  </div>
);
```

#### 3. Passar globalCss para o HtmlBlock

Modificar o contexto ou props para que cada `HtmlBlock` tenha acesso ao `globalCss`.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/HtmlBlockPreview.tsx` | **NOVO** - Componente de preview isolado |
| `src/components/eficode/user-components/HtmlBlock.tsx` | Usar iframe para visualização, manter ContentEditable para edição |
| `src/pages/EfiCodeEditor.tsx` | Passar globalCss para os componentes via Context |
| `src/components/eficode/user-components/index.ts` | Exportar `HtmlBlockPreview` |

### Considerações de Implementação

1. **Altura dinâmica do iframe**: O iframe precisa ajustar sua altura ao conteúdo. Isso pode ser feito com `ResizeObserver` dentro do iframe.

2. **Interatividade no Craft.js**: No modo edição, o ContentEditable continua funcionando. O iframe só é usado para preview.

3. **Performance**: Iframes têm overhead, mas para poucos blocos por página não será problema significativo.

4. **Comunicação entre iframe e parent**: Para eventos de clique e seleção, usar `postMessage` ou wrapper clicável sobre o iframe.

### Fluxo de Edição

```text
1. Usuário arrasta bloco "Página NPS" para o canvas
2. HtmlBlock renderiza com ContentEditable (pode não parecer perfeito)
3. Usuário salva e clica em "Prévia"
4. EfiCodePreview renderiza tudo em iframe isolado (perfeito!)
5. HTML exportado inclui Global CSS inline (perfeito!)

OU (alternativa mais complexa):

1. Mesmo no editor, usar iframe para visualização
2. Ao clicar no bloco, sobrepor painel de edição
3. Edição acontece em modal/painel lateral
4. Canvas sempre mostra preview fiel
```

## Alternativa Mais Simples

Se a complexidade do iframe for muito alta, podemos garantir que o Global CSS contenha TODAS as definições necessárias como CSS puro (não classes Tailwind). Isso significa que no admin, ao colar o CSS, ele precisa ser o CSS **compilado** completo, não apenas variáveis.

### Verificar Global CSS Atual

O Global CSS atual parece conter apenas o reset do Tailwind. Para funcionar, ele precisa conter definições como:

```css
.size-40 { width: 40px; height: 40px; }
.grid-cols-11 { grid-template-columns: repeat(11, minmax(0, 1fr)); }
.bg-elevation-1 { background-color: #232323; }
.bg-elevation-3 { background-color: #2d2d2d; }
.bg-elevation-5 { background-color: #3a3a3a; }
.text-base-medium { color: rgba(255,255,255,0.87); }
.text-base-high { color: #f97316; }
/* ... etc */
```

## Recomendação

A **Opção A (iframe)** é a mais robusta pois garante isolamento total de estilos, independentemente do que o usuário colocar no Global CSS.

No entanto, para uma solução mais rápida, podemos primeiro verificar e corrigir o **conteúdo do Global CSS** para garantir que todas as classes utilitárias necessárias estejam definidas.

## Próximos Passos

1. **Implementar componente `HtmlBlockPreview`** com iframe isolado
2. **Modificar `HtmlBlock`** para alternar entre preview (iframe) e edição (ContentEditable)
3. **Criar contexto React** para passar `globalCss` aos componentes
4. **Testar** com o bloco "Página NPS" para verificar renderização correta
