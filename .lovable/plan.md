

# Plano: Exclusão Segura de Arquivos

## Lógica Atual (Problema)

Hoje o fluxo é: deletar do storage -> se falhar, aborta tudo -> deletar do banco. Se o storage falha (timeout em arquivos grandes, ou arquivo já não existe), o registro do banco nunca é removido e o arquivo fica "preso" na lista.

## Nova Lógica

1. **Verificar se o arquivo existe no storage** usando `list()` no caminho do arquivo
2. **Se existe**: deletar do storage, depois deletar do banco
3. **Se não existe**: apenas deletar o registro do banco (sem tentar remover do storage)
4. Em ambos os casos, o registro do banco é sempre removido

## Detalhes Tecnicos

### Arquivo: `src/pages/Downloads.tsx`

Substituir a funcao `handleDelete` por:

```typescript
const handleDelete = async () => {
  if (!deleteId) return;

  const fileIdToDelete = deleteId;
  setDeletingId(fileIdToDelete);
  setDeleteId(null);

  try {
    const file = files?.find((f) => f.id === fileIdToDelete);
    if (!file) return;

    // 1. Checar se o arquivo existe no storage
    const folder = file.file_path.substring(0, file.file_path.lastIndexOf('/'));
    const fileName = file.file_path.substring(file.file_path.lastIndexOf('/') + 1);

    const { data: listData } = await supabase.storage
      .from('media-downloads')
      .list(folder || undefined, {
        search: fileName,
      });

    const existsInStorage = listData?.some((f) => f.name === fileName);

    // 2. Se existe no storage, deletar
    if (existsInStorage) {
      const { error: storageError } = await supabase.storage
        .from('media-downloads')
        .remove([file.file_path]);

      if (storageError) {
        console.error('Erro ao deletar do storage:', storageError);
        // Continua mesmo assim para remover do banco
      }
    }

    // 3. Sempre deletar o registro do banco
    const { error: dbError } = await supabase
      .from('shared_files')
      .delete()
      .eq('id', fileIdToDelete);

    if (dbError) throw dbError;

    queryClient.invalidateQueries({ queryKey: ['shared-files'] });
    toast({
      title: 'Arquivo deletado',
      description: existsInStorage
        ? 'O arquivo foi removido com sucesso'
        : 'O registro foi removido (arquivo já não existia no storage)',
    });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    toast({
      title: 'Erro ao deletar',
      description: 'Não foi possível remover o arquivo',
      variant: 'destructive',
    });
  } finally {
    setDeletingId(null);
  }
};
```

## Resumo do Fluxo

```text
Clicou em deletar
  |
  v
Arquivo existe no storage?
  |          |
 SIM        NAO
  |          |
  v          |
Deletar     |
do storage  |
  |          |
  v          v
Deletar registro do banco (SEMPRE)
  |
  v
Atualizar lista
```

## Arquivo a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Downloads.tsx` | Reescrever `handleDelete` com checagem de existencia |

