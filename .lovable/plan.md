

# Plano: Adicionar Botão "Deletar" para Exclusão em Lote

## Objetivo

Adicionar um botão "Deletar" separado no dropdown "Ações" que permita ao usuário selecionar múltiplos blocos e excluí-los em lote.

## Componentes da Solução

### 1. Estado de Seleção

Adicionar estados para controlar:
- Modo de seleção ativado/desativado
- Lista de IDs dos blocos selecionados

```typescript
const [isDeleteMode, setIsDeleteMode] = useState(false);
const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
```

### 2. Modificar o Dropdown "Ações"

Adicionar novo item de menu separado por um divisor:

```text
┌──────────────────┐
│ CSS Global       │
│ Biblioteca       │
│ Importar com IA  │
├──────────────────┤
│ Deletar          │  ← Novo item
└──────────────────┘
```

### 3. Modificar a Tabela

Quando o modo de exclusão estiver ativo:
- Adicionar coluna de checkbox à esquerda
- Mostrar checkbox de seleção para cada linha
- Adicionar checkbox "Selecionar todos" no header
- Exibir barra de ações fixa na parte inferior

### 4. Barra de Ações de Exclusão

Quando houver itens selecionados, exibir barra fixa:

```text
┌─────────────────────────────────────────────────────────────┐
│  ✓ 3 blocos selecionados     [Cancelar]  [Excluir 3 blocos] │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Interação

```text
1. Usuário clica em "Ações" → "Deletar"
   ↓
2. Modo de exclusão é ativado
   - Checkboxes aparecem na tabela
   - Barra de ações aparece na parte inferior
   ↓
3. Usuário seleciona os blocos desejados
   - Pode usar "Selecionar todos"
   - Contador atualiza em tempo real
   ↓
4. Usuário clica em "Excluir X blocos"
   ↓
5. Confirmação via dialog
   ↓
6. Exclusão em lote é executada
   ↓
7. Modo de exclusão é desativado
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AdminEfiCodeBlocks.tsx` | Adicionar estados, checkbox na tabela, barra de ações, lógica de exclusão em lote |

## Código Proposto

### Estados Novos

```typescript
const [isDeleteMode, setIsDeleteMode] = useState(false);
const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
```

### Handlers

```typescript
// Toggle seleção individual
const toggleBlockSelection = (id: string) => {
  setSelectedBlockIds(prev => 
    prev.includes(id) 
      ? prev.filter(blockId => blockId !== id)
      : [...prev, id]
  );
};

// Selecionar/Desselecionar todos
const toggleSelectAll = () => {
  if (selectedBlockIds.length === blocks.length) {
    setSelectedBlockIds([]);
  } else {
    setSelectedBlockIds(blocks.map(b => b.id));
  }
};

// Exclusão em lote
const handleBatchDelete = async () => {
  if (!confirm(`Tem certeza que deseja excluir ${selectedBlockIds.length} blocos?`)) return;
  
  try {
    for (const id of selectedBlockIds) {
      await deleteBlock.mutateAsync(id);
    }
    toast.success(`${selectedBlockIds.length} blocos excluídos`);
    setSelectedBlockIds([]);
    setIsDeleteMode(false);
  } catch (error) {
    toast.error('Erro ao excluir blocos');
  }
};

// Cancelar modo de exclusão
const cancelDeleteMode = () => {
  setIsDeleteMode(false);
  setSelectedBlockIds([]);
};
```

### Nova Coluna na Tabela (quando isDeleteMode = true)

```tsx
{isDeleteMode && (
  <TableHead className="w-10">
    <Checkbox 
      checked={selectedBlockIds.length === blocks.length && blocks.length > 0}
      onCheckedChange={toggleSelectAll}
    />
  </TableHead>
)}
```

### Checkbox em Cada Linha

```tsx
{isDeleteMode && (
  <TableCell>
    <Checkbox 
      checked={selectedBlockIds.includes(block.id)}
      onCheckedChange={() => toggleBlockSelection(block.id)}
    />
  </TableCell>
)}
```

### Barra Fixa de Ações

```tsx
{isDeleteMode && (
  <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex items-center justify-between z-50">
    <span className="text-sm text-muted-foreground">
      {selectedBlockIds.length} bloco(s) selecionado(s)
    </span>
    <div className="flex gap-2">
      <Button variant="outline" onClick={cancelDeleteMode}>
        Cancelar
      </Button>
      <Button 
        variant="destructive" 
        onClick={handleBatchDelete}
        disabled={selectedBlockIds.length === 0}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Excluir {selectedBlockIds.length} bloco(s)
      </Button>
    </div>
  </div>
)}
```

### Item no Dropdown Ações

```tsx
<DropdownMenuSeparator />
<DropdownMenuItem 
  onClick={() => setIsDeleteMode(true)}
  className="text-destructive focus:text-destructive"
>
  <Trash2 className="h-4 w-4 mr-2" />
  Deletar
</DropdownMenuItem>
```

## Resultado Esperado

- Novo botão "Deletar" no dropdown "Ações" separado por divisor
- Ao clicar, ativa modo de seleção com checkboxes na tabela
- Barra fixa na parte inferior mostra contador e botões de ação
- Exclusão em lote com confirmação antes de executar
- Ao concluir ou cancelar, modo de exclusão é desativado

