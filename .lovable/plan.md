

# Plano: Corrigir Upload de Imagens com Caracteres Especiais

## Problema Identificado

O erro `StorageApiError: Invalid key` ocorre porque o nome do arquivo contém caracteres não permitidos pelo Supabase Storage:

```
assets/577ba0fb-5247-4d33-b885-dabef5e436af-Eu faço a estratégia - profile frames - 1.png
```

Caracteres problemáticos:
- Espaços (` `)
- Caracteres acentuados (`ç`, `é`, etc.)
- Hífens consecutivos podem causar problemas

## Solução

Sanitizar o nome do arquivo antes do upload, removendo ou substituindo caracteres especiais.

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useImageCampaigns.ts` | Criar função de sanitização e aplicar ao nome do arquivo |

---

## Código Atual vs Corrigido

### Antes (linha 286-287):
```typescript
mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
  const fileName = `${folder}/${crypto.randomUUID()}-${file.name}`;
```

### Depois:
```typescript
// Função para sanitizar nome de arquivo
const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')                    // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')     // Remove acentos
    .replace(/[^a-zA-Z0-9.-]/g, '_')     // Substitui caracteres especiais por _
    .replace(/_+/g, '_')                 // Remove underscores duplicados
    .replace(/^_|_$/g, '');              // Remove underscores no início/fim
};

mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
  const sanitizedName = sanitizeFileName(file.name);
  const fileName = `${folder}/${crypto.randomUUID()}-${sanitizedName}`;
```

---

## Exemplo de Transformação

| Original | Sanitizado |
|----------|------------|
| `Eu faço a estratégia - profile frames - 1.png` | `Eu_faco_a_estrategia_profile_frames_1.png` |
| `Imagem (cópia).jpg` | `Imagem_copia.jpg` |
| `foto@2x.png` | `foto_2x.png` |

---

## Implementação Completa

```typescript
// Função para sanitizar nome de arquivo (adicionar no início do arquivo)
const sanitizeFileName = (name: string): string => {
  // Separa nome e extensão
  const lastDot = name.lastIndexOf('.');
  const baseName = lastDot > 0 ? name.substring(0, lastDot) : name;
  const extension = lastDot > 0 ? name.substring(lastDot) : '';
  
  // Sanitiza apenas o nome, mantendo a extensão
  const sanitizedBase = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return sanitizedBase + extension.toLowerCase();
};

// Hook para upload de imagem para storage
export function useUploadCampaignImage() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${folder}/${crypto.randomUUID()}-${sanitizedName}`;
      
      const { data, error } = await supabase.storage
        .from("image-campaigns")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("image-campaigns")
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fazer upload: ${error.message}`);
    },
  });
}
```

---

## Resultado Esperado

1. Uploads de imagens com qualquer nome funcionam corretamente
2. Caracteres especiais são automaticamente convertidos
3. A extensão do arquivo é preservada
4. O UUID garante unicidade mesmo com nomes sanitizados iguais

