

## Plano: CSS Global para Efi Code

### Objetivo

Adicionar um botão "CSS Global" na página `/admin/efi-code-blocks` que permite definir estilos CSS que serão automaticamente incluídos em todos os sites criados no editor `/efi-code/[hash]` ao exportar HTML.

---

### Fluxo Visual

```text
┌────────────────────────────────────────────────────────────────────┐
│  Admin: /admin/efi-code-blocks                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Blocos do Efi Code                    [CSS Global] [+ Novo Bloco] │
│  Gerencie os componentes disponíveis                               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Pos │ Ícone │ Nome │ Categoria │ Componente │ Ativo │ Ações  │  │
│  │ ... │ ...   │ ...  │ ...       │ ...        │ ...   │ ...    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (Ao clicar em "CSS Global")
┌────────────────────────────────────────────────────────────────────┐
│  Modal: CSS Global                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Este CSS será incluído em todos os sites do Efi Code              │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ /* Reset e estilos globais */                                │  │
│  │ body {                                                       │  │
│  │   font-family: 'Inter', sans-serif;                          │  │
│  │ }                                                            │  │
│  │                                                              │  │
│  │ .btn-primary {                                               │  │
│  │   background: linear-gradient(135deg, #00809d, #005f74);    │  │
│  │   transition: all 0.3s ease;                                 │  │
│  │ }                                                            │  │
│  │ ...                                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                              [Cancelar]  [Salvar CSS]              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### Estrutura do Banco de Dados

#### Nova Tabela: `efi_code_config`

Armazena configurações globais do Efi Code, incluindo o CSS global.

```sql
CREATE TABLE public.efi_code_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_css TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir registro único inicial
INSERT INTO public.efi_code_config (global_css) VALUES ('');

-- RLS
ALTER TABLE public.efi_code_config ENABLE ROW LEVEL SECURITY;

-- Política: admins podem ler/atualizar
CREATE POLICY "Admins can manage efi_code_config"
  ON public.efi_code_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
```

---

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useEfiCodeConfig.ts` | Hook para gerenciar configurações globais do Efi Code |

---

### Alterações em Arquivos Existentes

#### 1. `src/pages/AdminEfiCodeBlocks.tsx`

**Adicionar:**
- Estado para controlar o modal de CSS global (`isCssDialogOpen`)
- Estado para o conteúdo CSS (`globalCss`)
- Botão "CSS Global" ao lado do botão "+ Novo Bloco"
- Modal/Dialog para editar o CSS global com Textarea de altura grande
- Lógica para carregar e salvar o CSS usando o novo hook

**Layout do header atualizado:**
```typescript
<div className="flex items-center gap-2">
  <Button variant="outline" onClick={() => setIsCssDialogOpen(true)}>
    <Code className="h-4 w-4 mr-2" />
    CSS Global
  </Button>
  <Button onClick={() => handleOpenDialog()}>
    <Plus className="h-4 w-4 mr-2" />
    Novo Bloco
  </Button>
</div>
```

#### 2. `src/pages/EfiCodeEditor.tsx`

**Modificar a função `generateFullHtml`:**

Adicionar o CSS global na seção `<style>` do HTML exportado:

```typescript
const generateFullHtml = (
  nodes: Record<string, any>, 
  siteName: string, 
  pageSettings: PageSettings,
  globalCss: string  // NOVO PARÂMETRO
): string => {
  // ... código existente ...
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <!-- ... meta tags ... -->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background-color: ${pageSettings.backgroundColor || '#ffffff'};
    }
    .page-container {
      max-width: ${pageSettings.containerMaxWidth || '1200'}px;
      margin: 0 auto;
    }
    img { max-width: 100%; }
    
    /* CSS Global do Efi Code */
    ${globalCss}
  </style>
</head>
<!-- ... resto do HTML ... -->
`;
};
```

**Adicionar:**
- Import do novo hook `useEfiCodeConfig`
- Buscar o CSS global ao carregar o editor
- Passar o CSS global para `generateFullHtml` no export

---

### Hook: `useEfiCodeConfig.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EfiCodeConfig {
  id: string;
  global_css: string;
  created_at: string;
  updated_at: string;
}

export const useEfiCodeConfig = () => {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['efi-code-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('efi_code_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as EfiCodeConfig;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: { global_css: string }) => {
      const config = configQuery.data;
      if (!config) throw new Error('Config not found');
      
      const { data, error } = await supabase
        .from('efi_code_config')
        .update({
          global_css: updates.global_css,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EfiCodeConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efi-code-config'] });
      toast.success('CSS global salvo!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar CSS: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    globalCss: configQuery.data?.global_css || '',
    updateConfig,
  };
};
```

---

### Resumo das Alterações

| Tipo | Arquivo/Recurso | Descrição |
|------|-----------------|-----------|
| SQL | Migration | Criar tabela `efi_code_config` |
| Novo | `src/hooks/useEfiCodeConfig.ts` | Hook para gerenciar config global |
| Edição | `src/pages/AdminEfiCodeBlocks.tsx` | Adicionar botão e modal de CSS |
| Edição | `src/pages/EfiCodeEditor.tsx` | Injetar CSS global no export HTML |

---

### Comportamento Final

1. Admin acessa `/admin/efi-code-blocks`
2. Clica no botão "CSS Global"
3. Edita o CSS em um textarea grande
4. Salva - CSS é persistido no banco
5. Ao exportar qualquer site no `/efi-code/[hash]`, o CSS global é automaticamente incluído

