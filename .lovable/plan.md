

## Plano: Corrigir Loading Infinito em Página Pública

### Diagnóstico

O problema ocorre porque:

1. O Supabase client mantém tokens de autenticação no **localStorage**
2. Quando o token está corrompido/expirado, o client tenta usá-lo automaticamente
3. Isso pode causar falhas nas requisições, **mesmo para dados públicos**
4. Limpar "cache do navegador" não remove localStorage/IndexedDB

### Solução Imediata (para você testar agora)

Abra o DevTools (F12) → Application → Local Storage → martech-efi.lovable.app e delete:
- `sb-dbxaamdirxjrbolsegwz-auth-token`

Ou execute no console:
```javascript
localStorage.removeItem('sb-dbxaamdirxjrbolsegwz-auth-token');
location.reload();
```

---

### Correção no Código

Adicionar tratamento de erro robusto na página `ImageCampaignPublic.tsx`:

#### 1. Adicionar retry específico para páginas públicas

```typescript
// src/hooks/useImageCampaigns.ts - Modificar useCampaign

export function useCampaign(slug: string | undefined) {
  return useQuery({
    queryKey: ["image-campaign", slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from("image_campaigns")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as ImageCampaign;
    },
    enabled: !!slug,
    retry: 3,                    // NOVO: Tentar 3 vezes
    retryDelay: 1000,            // NOVO: 1 segundo entre tentativas
    staleTime: 0,                // NOVO: Sempre buscar dados frescos
  });
}
```

#### 2. Adicionar timeout e tratamento de erro na página

**Arquivo:** `src/pages/ImageCampaignPublic.tsx`

```typescript
// Adicionar estado de timeout
const [loadingTimeout, setLoadingTimeout] = useState(false);

// useEffect para detectar loading travado
useEffect(() => {
  if (loadingCampaign) {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000); // 10 segundos
    
    return () => clearTimeout(timer);
  } else {
    setLoadingTimeout(false);
  }
}, [loadingCampaign]);

// Função para limpar storage e recarregar
const handleRetry = () => {
  localStorage.removeItem('sb-dbxaamdirxjrbolsegwz-auth-token');
  window.location.reload();
};

// Modificar o render de loading
if (loadingCampaign) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {loadingTimeout && (
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            O carregamento está demorando mais que o esperado
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useImageCampaigns.ts` | Adicionar `retry: 3`, `retryDelay: 1000`, `staleTime: 0` ao `useCampaign` |
| `src/pages/ImageCampaignPublic.tsx` | Adicionar detecção de timeout (10s) e botão "Tentar novamente" que limpa localStorage |

### Resultado Esperado

- Usuários não ficam presos em loading infinito
- Após 10 segundos, aparece opção de "Tentar novamente"
- O botão limpa tokens problemáticos e recarrega a página
- Funciona mesmo com sessões corrompidas

