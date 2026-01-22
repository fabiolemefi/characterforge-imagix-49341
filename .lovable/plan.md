

## Plano: Campo HTML para Blocos Efi Code + Importação

### Objetivo

Adicionar suporte a **blocos com HTML personalizado** no Efi Code:
1. Novo campo `html_content` na tabela de blocos
2. Editor de código com tema escuro (estilo HTML) no formulário de criação/edição
3. Botão de "Importar" ao lado do "Novo Bloco" para importar blocos via JSON/código
4. Novo componente `HtmlBlock` que renderiza HTML customizado no editor

---

### 1. Estrutura do Banco de Dados

Adicionar nova coluna à tabela `efi_code_blocks`:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `html_content` | text | Código HTML personalizado do bloco (opcional) |

Quando `html_content` está preenchido, o bloco usará o novo componente `HtmlBlock` ao invés dos componentes padrão (Container, Heading, etc).

---

### 2. Interface do Formulário de Bloco

Transformar o botão "Novo Bloco" em um dropdown com duas opções:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Blocos do Efi Code                                                     │
│                                                                         │
│  [CSS Global] [Biblioteca] [+ Novo Bloco ▾]                            │
│                                    ├─────────────────┤                  │
│                                    │ ✨ Criar Bloco  │                  │
│                                    │ 📥 Importar     │                  │
│                                    └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Formulário de Criação/Edição (atualizado)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Novo Bloco                                                       [X]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Nome: [________________]     Categoria: [Layout ▾]    Posição: [0]     │
│                                                                          │
│  Descrição: [________________________________________________]           │
│                                                                          │
│  Ícone: [SquareDashed ▾]                                                │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  Código HTML                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ <div class="hero-section">                                       │   │
│  │   <h1>Título Principal</h1>                                      │   │
│  │   <p>Subtítulo descritivo</p>                                    │   │
│  │   <a href="#" class="btn">Saiba mais</a>                         │   │
│  │ </div>                                                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         ↑ Fundo escuro (#1e1e1e), syntax highlight HTML                 │
│                                                                          │
│  ☐ Bloco ativo                                                          │
│                                                                          │
│                                              [Cancelar] [Criar Bloco]   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Mudanças principais:**
- Campo `component_type` removido (não é mais necessário para blocos HTML)
- Campo `default_props` removido (as props agora estão dentro do HTML)
- Novo campo `html_content` com editor de código estilizado

---

### 4. Modal de Importação

Ao clicar em "Importar", abre um modal para colar JSON ou código:

```text
┌────────────────────────────────────────────────────────────────┐
│  Importar Bloco                                          [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Cole o JSON ou HTML do bloco:                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ {                                                        │  │
│  │   "name": "Hero Section",                                │  │
│  │   "category": "layout",                                  │  │
│  │   "icon_name": "LayoutGrid",                             │  │
│  │   "html_content": "<div class='hero'>...</div>"          │  │
│  │ }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↑ Fundo escuro, syntax highlight JSON/HTML             │
│                                                                │
│  ☐ Substituir se já existir (mesmo nome)                      │
│                                                                │
│                              [Cancelar] [Importar]             │
└────────────────────────────────────────────────────────────────┘
```

**Formatos aceitos:**
1. **JSON completo**: Objeto com todas as propriedades do bloco
2. **HTML puro**: Apenas o código HTML (nome será solicitado em seguida)
3. **JSON com múltiplos blocos**: Array de objetos para importação em lote

---

### 5. Novo Componente: HtmlBlock

Criar componente Craft.js que renderiza HTML personalizado:

```typescript
// src/components/eficode/user-components/HtmlBlock.tsx

interface HtmlBlockProps {
  html: string;
  className?: string;
}

export const HtmlBlock = ({ html, className }: HtmlBlockProps) => {
  // Renderiza HTML customizado de forma segura
  // Editável via contentEditable no editor
};

HtmlBlock.craft = {
  displayName: 'Bloco HTML',
  props: { html: '', className: '' },
  related: { settings: HtmlBlockSettings },
};
```

**Características:**
- Renderiza HTML usando `dangerouslySetInnerHTML` (conteúdo controlado pelo admin)
- Editável inline no canvas (contentEditable)
- Painel de configurações permite editar o HTML diretamente

---

### 6. Atualização do Toolbox

Modificar a função `getComponent` para suportar blocos HTML:

```typescript
const getComponent = (block: EfiCodeBlock) => {
  // Se tem html_content, usar HtmlBlock
  if (block.html_content) {
    return <HtmlBlock html={block.html_content} />;
  }
  
  // Caso contrário, usar componente padrão (compatibilidade)
  switch (block.component_type) {
    case 'Container':
      return <Element is={Container} canvas {...block.default_props} />;
    // ... outros casos
  }
};
```

---

### 7. Estilo do Editor de Código

Criar estilo CSS para o campo de código com tema escuro:

```css
.code-editor {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  border-radius: 6px;
  min-height: 200px;
}

/* Destaque de sintaxe básico via textarea */
.code-editor::placeholder {
  color: #666;
}
```

**Nota técnica:** Para syntax highlight completo, seria necessário uma biblioteca como CodeMirror ou Monaco Editor. A implementação inicial usará um Textarea estilizado que já fornece a experiência visual desejada (fundo escuro, fonte monospace).

---

### 8. Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/xxx.sql` | Adicionar coluna `html_content` |
| `src/hooks/useEfiCodeBlocks.ts` | Incluir campo `html_content` no tipo e operações |
| `src/pages/AdminEfiCodeBlocks.tsx` | Refatorar formulário com dropdown e campo HTML |
| `src/components/eficode/user-components/HtmlBlock.tsx` | **Novo** - Componente para renderizar HTML |
| `src/components/eficode/user-components/index.ts` | Exportar HtmlBlock |
| `src/components/eficode/editor/Toolbox.tsx` | Atualizar `getComponent` para suportar HtmlBlock |
| `src/components/eficode/BlockImportModal.tsx` | **Novo** - Modal de importação |

---

### 9. Fluxo de Uso

```text
┌────────────────────────────────────────────────────────────────────────┐
│  1. Admin acessa /admin/efi-code-blocks                                │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐     ┌─────────────────────────────────────┐
│  Clica em "Criar Bloco" │     │  Clica em "Importar"                │
└───────────┬─────────────┘     └──────────────┬──────────────────────┘
            │                                  │
            ▼                                  ▼
┌─────────────────────────┐     ┌─────────────────────────────────────┐
│  Preenche formulário:   │     │  Cola JSON/HTML do bloco            │
│  - Nome                 │     │  - Valida estrutura                 │
│  - HTML (editor escuro) │     │  - Preenche campos automaticamente  │
│  - Categoria            │     └──────────────┬──────────────────────┘
│  - Ícone                │                    │
└───────────┬─────────────┘                    │
            │                                  │
            └────────────────┬─────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. Bloco salvo no banco com html_content                              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  3. Usuário abre editor /efi-code/:id                                  │
│     - Toolbox carrega blocos do banco                                  │
│     - Blocos com html_content usam HtmlBlock                           │
│     - Arrasta bloco para canvas → HTML renderizado                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 10. Resultado Final

1. **Campo HTML** no formulário de criação/edição de blocos com tema escuro
2. **Dropdown** no botão "Novo Bloco" com opções Criar e Importar
3. **Modal de Importação** para colar JSON ou HTML de blocos
4. **Componente HtmlBlock** que renderiza HTML customizado no canvas
5. **Retrocompatibilidade** com blocos existentes que usam component_type

