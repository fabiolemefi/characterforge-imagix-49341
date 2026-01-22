

## Plano: Melhorias no Header do Efi Code Editor

### Objetivo

Reorganizar o header do editor para incluir:
1. Dropdown "Ações" agrupando Prévia e Exportar HTML
2. Toggle Visual/Código com sincronização bidirecional
3. Toggles de responsividade (Web/Tablet/Mobile)

---

### Layout Proposto do Header

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  [←] [Nome do Site_______] [Web|Tablet|Mobile]     [Visual|Código] [⤺][⤻] [Ações▾] [Salvar] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Dropdown "Ações"

Substituir os botões "Prévia" e "Exportar HTML" por um único dropdown:

| Item | Ícone | Ação |
|------|-------|------|
| Prévia | Eye | Salva e abre nova aba com preview |
| Exportar HTML | Download | Baixa arquivo .html |

Componente: `DropdownMenu` do shadcn/ui.

---

### 2. Toggle Visual/Código

**Comportamento:**
- **Visual (padrão)**: Exibe o editor Craft.js normalmente
- **Código**: Exibe um editor de texto com o HTML gerado

**Sincronização Bidirecional:**
- Visual → Código: Ao alternar para código, gera HTML do estado atual do Craft.js
- Código → Visual: Ao alternar para visual, precisa "parsear" o HTML e reconstruir os nodes do Craft.js

**Desafio Técnico:**
O Craft.js usa uma estrutura JSON específica para representar componentes. Converter HTML arbitrário de volta para essa estrutura é complexo.

**Solução Proposta:**
- Modo Código será **somente leitura** inicialmente, permitindo copiar/visualizar o HTML
- OU implementar um parser simples que detecta estruturas conhecidas (Container, Heading, Text, Button, Image, Divider, Spacer) e reconstrói os nodes

**Recomendação:** Começar com modo de edição limitado, onde:
1. O usuário pode editar textos inline no HTML
2. Mudanças estruturais (adicionar/remover elementos) são feitas no modo Visual
3. O parser tenta extrair os valores de props conhecidos do HTML editado

**Componente:** Toggle usando `ToggleGroup` do shadcn/ui ou botões com estado.

---

### 3. Toggles de Responsividade

**Breakpoints:**
| Modo | Largura do Preview | Ícone |
|------|-------------------|-------|
| Web | 100% (padrão) | Monitor |
| Tablet | 768px | Tablet |
| Mobile | 375px | Smartphone |

**Comportamento:**
- Ao clicar em Tablet/Mobile, o container do viewport centraliza e limita a largura
- Adiciona uma borda visual para simular a tela do dispositivo
- Não altera o HTML, apenas a visualização

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EfiCodeEditor.tsx` | Adicionar estados para viewMode (visual/code), viewportWidth. Reorganizar header com dropdown e toggles |
| `src/lib/efiCodeHtmlGenerator.ts` | (Opcional) Adicionar função para parsear HTML de volta para nodes |

---

### Novo Estado no EfiCodeEditor

```typescript
// Estados novos
const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
const [codeContent, setCodeContent] = useState<string>('');

// Dimensões do viewport
const viewportWidths = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};
```

---

### Estrutura do Código no Modo Código

```typescript
{viewMode === 'visual' ? (
  <EditorFrame editorState={editorState} />
) : (
  <div className="w-full h-full">
    <textarea
      value={codeContent}
      onChange={(e) => setCodeContent(e.target.value)}
      className="w-full h-full font-mono text-sm p-4 bg-gray-900 text-gray-100"
      spellCheck={false}
    />
  </div>
)}
```

---

### Fluxo de Sincronização

```text
┌─────────────────────────────────────────────────────────────────┐
│  Modo Visual                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Craft.js Editor (drag & drop)                            │  │
│  │  State: JSON nodes                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         [Toggle para Código]
         generateFullHtml(nodes)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Modo Código                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  <textarea> com HTML                                      │  │
│  │  Usuário pode editar textos, cores, etc.                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         [Toggle para Visual]
         parseHtmlToNodes(html) ← Parser limitado
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Modo Visual (atualizado)                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Craft.js com nodes reconstruídos                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Componentes UI Necessários

- `DropdownMenu` - Para o botão "Ações"
- `ToggleGroup` - Para Visual/Código e Web/Tablet/Mobile
- `Textarea` ou editor de código (pode usar Monaco Editor futuramente)

---

### Implementação em Fases

**Fase 1 (Esta implementação):**
- Dropdown "Ações" com Prévia e Exportar HTML
- Toggles de responsividade funcionais
- Toggle Visual/Código com modo código **somente visualização**

**Fase 2 (Futura):**
- Editor de código com syntax highlighting (Monaco Editor)
- Parser HTML → Craft.js nodes para edição bidirecional

---

### Resultado Final

- Header mais limpo e organizado
- Fácil visualização em diferentes resoluções
- Possibilidade de ver/copiar o código HTML gerado
- Preparado para edição de código no futuro

