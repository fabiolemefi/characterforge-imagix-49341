

## Plano: Aba de Ícones com Importação ZIP

### Objetivo

Adicionar uma terceira aba "Ícones" no dialog da Biblioteca de Imagens com:
1. Lista de ícones SVG com agrupamento por prefixo do nome
2. Botão "Novo Ícone" para upload individual
3. Botão "Importar" para upload de ZIP com múltiplos ícones
4. Opção de "substituir existentes" na importação

---

### 1. Estrutura do Banco de Dados

Nova tabela específica para ícones (separada das imagens para organização):

#### Tabela: `efi_library_icons`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Chave primária |
| `name` | text | Nome do arquivo (ex: "ilustra-dev-api-abertura") |
| `filename` | text | Nome original do arquivo com extensão |
| `group_prefix` | text | Prefixo agrupador (ex: "ilustra", "bolix", "geral") |
| `url` | text | URL pública do SVG |
| `is_active` | boolean | Se está ativo |
| `created_at` | timestamp | Data de criação |
| `created_by` | uuid | Usuário que fez upload |

**Lógica de agrupamento:**
- Se o nome começa com `ilustra-` → grupo "ilustra"
- Se o nome começa com `bolix-` → grupo "bolix"
- Qualquer outro → grupo "geral"

---

### 2. Interface da Aba Ícones

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Biblioteca de Imagens                                           [X]    │
├──────────────────────────────────────────────────────────────────────────┤
│  [Categorias] [Imagens] [Ícones]                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Todos ▾]  [🔍 Buscar...]              [📥 Importar] [+ Novo Ícone]    │
│                                                                          │
│  ▼ ilustra (45 ícones)                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │ SVG  │ │ SVG  │ │ SVG  │ │ SVG  │ │ SVG  │ │ SVG  │                  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                  │
│  abertura  conta    extrato  extrato-1 cobranca ...                     │
│                                                                          │
│  ▼ geral (12 ícones)                                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐                                              │
│  │ SVG  │ │ SVG  │ │ SVG  │                                              │
│  └──────┘ └──────┘ └──────┘                                              │
│  arrow    check    close                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Modal de Importação ZIP

```text
┌────────────────────────────────────────────────────────────────┐
│  Importar Ícones                                         [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │     📁 Arraste um arquivo .zip aqui                     │  │
│  │        ou clique para selecionar                        │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ☐ Substituir ícones existentes com mesmo nome                │
│                                                                │
│  ─────────────────────────────────────────────────────────────  │
│  Prévia (após selecionar ZIP):                                 │
│                                                                │
│  ✓ ilustra-dev-api-abertura.svg                               │
│  ✓ ilustra-dev-api-conta.svg                                  │
│  ⚠️ bolix.svg (já existe - será ignorado)                      │
│  ✓ novo-icone.svg                                              │
│                                                                │
│  Total: 45 ícones | Novos: 42 | Ignorados: 3                  │
│                                                                │
│                              [Cancelar] [Importar 42 ícones]  │
└────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
1. Usuário seleciona arquivo ZIP
2. Sistema extrai lista de SVGs usando `jszip` (já instalado)
3. Verifica quais já existem no banco (por `filename`)
4. Exibe prévia com status de cada arquivo
5. Se "substituir" marcado: sobrescreve existentes
6. Se "substituir" desmarcado (padrão): ignora existentes

---

### 4. Hook Atualizado: useEfiImageLibrary

Adicionar métodos para ícones:

```typescript
// Novos tipos
interface EfiLibraryIcon {
  id: string;
  name: string;
  filename: string;
  group_prefix: string;
  url: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

// Novas funções
- iconsQuery - Lista todos os ícones
- iconsGrouped - Agrupa ícones por prefixo
- createIcon(data) - Cria um ícone
- updateIcon(id, data) - Atualiza ícone
- deleteIcon(id) - Deleta ícone
- uploadIcon(file) - Upload de SVG individual
- importIconsFromZip(file, replace) - Importa ZIP com opção de substituir
```

---

### 5. Lógica de Extração do Prefixo

```typescript
const extractGroupPrefix = (filename: string): string => {
  // Remove extensão
  const name = filename.replace(/\.svg$/i, '');
  
  // Prefixos conhecidos
  const knownPrefixes = ['ilustra', 'bolix', 'icon'];
  
  for (const prefix of knownPrefixes) {
    if (name.startsWith(`${prefix}-`)) {
      return prefix;
    }
  }
  
  // Se não tem prefixo conhecido, vai para "geral"
  return 'geral';
};
```

---

### 6. Fluxo de Importação ZIP

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuário seleciona arquivo .zip                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. JSZip extrai lista de arquivos                              │
│     - Filtra apenas .svg                                        │
│     - Ignora pastas vazias                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Consulta banco: quais filenames já existem?                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Exibe prévia com status:                                    │
│     - ✓ Novo (será adicionado)                                  │
│     - ⚠️ Existente (será ignorado OU substituído)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Usuário confirma importação                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Para cada SVG:                                              │
│     a. Upload para bucket (efi-code-assets/icons/)              │
│     b. Insert/Upsert no banco                                   │
│     c. Atualiza progresso                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/xxx.sql` | Criar tabela `efi_library_icons` com RLS |
| `src/hooks/useEfiImageLibrary.ts` | Adicionar queries/mutations para ícones |
| `src/components/eficode/ImageLibraryDialog.tsx` | Adicionar aba "Ícones" com IconsTab |
| `src/components/eficode/IconImportModal.tsx` | **Novo** - Modal de importação ZIP |

---

### 8. Estrutura no Bucket

```text
efi-code-assets/
├── library/
│   └── [imagens por categoria]
├── icons/
│   ├── ilustra-dev-api-abertura.svg
│   ├── ilustra-dev-api-conta.svg
│   ├── bolix.svg
│   └── arrow.svg
└── [outros]
```

---

### 9. Componente IconsTab (Resumo)

```typescript
const IconsTab = () => {
  // Estados
  const [filterGroup, setFilterGroup] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Agrupar ícones por prefixo
  const groupedIcons = useMemo(() => {
    const groups: Record<string, EfiLibraryIcon[]> = {};
    filteredIcons.forEach(icon => {
      const group = icon.group_prefix;
      if (!groups[group]) groups[group] = [];
      groups[group].push(icon);
    });
    return groups;
  }, [filteredIcons]);
  
  return (
    <>
      {/* Filtros e botões */}
      {/* Grid agrupado por prefixo */}
      {/* Modal de novo ícone */}
      <IconImportModal open={isImportOpen} onOpenChange={setIsImportOpen} />
    </>
  );
};
```

---

### 10. Resultado Final

1. **Nova aba "Ícones"** com grid visual dos SVGs
2. **Agrupamento automático** por prefixo do nome
3. **Upload individual** de novos ícones
4. **Importação em massa** via ZIP
5. **Opção de substituir** ou ignorar existentes
6. **Prévia antes de importar** mostrando o que será feito

