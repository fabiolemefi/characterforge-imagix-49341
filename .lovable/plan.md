

## Plano: Botão de Prévia no Efi Code Editor

### Objetivo

Adicionar um botão "Prévia" ao lado do "Exportar HTML" que:
1. Salva o site automaticamente
2. Abre uma nova aba com a prévia do HTML renderizado

---

### Opções de Implementação

| Opção | Prós | Contras |
|-------|------|---------|
| **A) Nova rota `/efi-code/:id/preview`** | URL compartilhável, SEO-friendly | Precisa criar nova página, carregar do banco |
| **B) Blob URL em nova aba** | Instantâneo, não precisa de rota extra | URL temporária, não compartilhável |
| **C) Salvar HTML no banco + rota pública** | URL permanente, pode publicar | Mais complexo, precisa salvar HTML no banco |

**Recomendação**: **Opção A** - Criar uma rota de preview que busca o site pelo ID e renderiza o HTML.

---

### Fluxo do Usuário

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Editor: /efi-code/439293e3-...                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [←] [Nome do Site________]           [⤺] [⤻] | [Prévia] [Exportar] [Salvar] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼ (Clica em "Prévia")
                                    1. Salva automaticamente
                                    2. Abre nova aba com:
                                       /efi-code/439293e3-.../preview
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Preview (HTML puro, sem React)                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    [Renderização exata do HTML gerado]                              │
│                                                                     │
│    Bem-vindo ao Efi Code                                            │
│    Arraste componentes para começar...                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Estrutura Técnica

#### Nova Página: `src/pages/EfiCodePreview.tsx`

Página que:
1. Busca o site pelo ID
2. Gera o HTML usando as mesmas funções do editor
3. Renderiza usando `dangerouslySetInnerHTML` ou iframe

```typescript
export default function EfiCodePreview() {
  const { id } = useParams();
  const { data: site } = useEfiCodeSite(id);
  const { globalCss } = useEfiCodeConfig();
  
  // Gera o HTML completo
  const html = useMemo(() => {
    if (!site?.content) return '';
    return generateFullHtml(site.content, site.name, site.page_settings, globalCss);
  }, [site, globalCss]);
  
  // Renderiza como iframe para isolamento completo
  return (
    <iframe
      srcDoc={html}
      className="w-full h-screen border-0"
      title="Preview"
    />
  );
}
```

---

### Alterações Necessárias

#### 1. Criar `src/pages/EfiCodePreview.tsx`
Nova página para renderizar a prévia.

#### 2. Mover funções de geração de HTML
Extrair `generateHtmlFromNodes` e `generateFullHtml` para um arquivo utilitário (`src/lib/efiCodeHtmlGenerator.ts`) para reutilizar no preview.

#### 3. Atualizar `src/App.tsx`
Adicionar nova rota:
```typescript
<Route path="/efi-code/:id/preview" element={<EfiCodePreview />} />
```

#### 4. Atualizar `src/pages/EfiCodeEditor.tsx`
Adicionar botão de prévia no componente `EditorActions`:
```typescript
const handlePreview = async (query: any) => {
  // 1. Salva primeiro
  await onSave(query);
  // 2. Abre nova aba
  window.open(`/efi-code/${id}/preview`, '_blank');
};

// No render:
<Button variant="outline" size="sm" onClick={() => handlePreview(query)}>
  <Eye className="h-4 w-4 mr-2" />
  Prévia
</Button>
```

---

### Arquivos a Criar/Modificar

| Tipo | Arquivo | Descrição |
|------|---------|-----------|
| Novo | `src/lib/efiCodeHtmlGenerator.ts` | Funções de geração HTML extraídas |
| Novo | `src/pages/EfiCodePreview.tsx` | Página de prévia |
| Edição | `src/App.tsx` | Adicionar rota `/efi-code/:id/preview` |
| Edição | `src/pages/EfiCodeEditor.tsx` | Adicionar botão "Prévia" + usar funções do utilitário |

---

### Bônus: Corrigir rota `/site/:slug`

Já existe um botão "Visualizar" na listagem de sites que aponta para `/site/:slug`, mas essa rota não existe. Podemos:
1. Criar a rota pública `/site/:slug` para sites publicados
2. Ou atualizar o botão para usar `/efi-code/:id/preview`

Recomendo criar ambas as rotas:
- `/efi-code/:id/preview` - Para desenvolvedores visualizarem rascunhos
- `/site/:slug` - Para sites publicados (URL limpa para compartilhar)

---

### Resultado Final

Após as alterações:
1. No editor, clicar em "Prévia" salva o site e abre nova aba com a renderização
2. A prévia mostra exatamente como o HTML ficará exportado
3. O CSS global é aplicado na prévia
4. Não precisa exportar arquivo para ver o resultado

