

## Plano: Configuração de Meta Tags Global e por Campanha

### Objetivo

Criar controle administrativo sobre as meta tags do site em dois níveis:
1. **Global**: Meta tags da página principal (Index) - afeta links do domínio raiz
2. **Por Campanha**: Meta tags específicas para cada campanha de geração de imagens (`/gerar/:slug`)

---

### Estrutura do Banco de Dados

#### 1. Nova Tabela: `site_settings`
Armazena configurações globais do site (meta tags da index).

```sql
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  twitter_card TEXT DEFAULT 'summary_large_image',
  favicon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir registro único
INSERT INTO site_settings (og_title, og_description) 
VALUES ('Martech Efí Bank', 'Martech Efi Bank');
```

#### 2. Alteração na Tabela: `image_campaigns`
Adicionar campos para SEO específico por campanha.

```sql
ALTER TABLE public.image_campaigns
ADD COLUMN og_title TEXT,
ADD COLUMN og_description TEXT,
ADD COLUMN og_image_url TEXT;
```

---

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AdminSiteSettings.tsx` | Página admin para configuração geral |
| `src/hooks/useSiteSettings.ts` | Hook para gerenciar configurações do site |

---

### Alterações em Arquivos Existentes

#### 1. `src/components/AdminSidebar.tsx`
Adicionar novo item de menu "Configuração Geral".

```typescript
{
  title: "Configuração Geral",
  url: "/admin/configuracao",
  icon: Settings,  // lucide-react
}
```

#### 2. `src/App.tsx`
Adicionar rota para a nova página.

```typescript
<Route path="/admin/configuracao" element={<AdminSiteSettings />} />
```

#### 3. `src/hooks/useImageCampaigns.ts`
Atualizar interfaces para incluir campos de SEO.

```typescript
export interface ImageCampaign {
  // ... campos existentes
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
}

export interface CreateCampaignData {
  // ... campos existentes
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
}
```

#### 4. `src/components/campaigns/CampaignFormDialog.tsx`
Adicionar seção "SEO & Compartilhamento" no formulário.

Nova seção com campos:
- **Título para compartilhamento** (og_title)
- **Descrição para compartilhamento** (og_description)
- **Imagem de preview** (og_image_url) - upload de imagem

#### 5. `src/pages/ImageCampaignPublic.tsx`
Usar `react-helmet` para injetar meta tags dinâmicas.

```typescript
import { Helmet } from "react-helmet";

// Dentro do componente, após carregar a campanha:
<Helmet>
  <title>{campaign.og_title || campaign.title}</title>
  <meta property="og:title" content={campaign.og_title || campaign.title} />
  <meta property="og:description" content={campaign.og_description || campaign.subtitle || ''} />
  {campaign.og_image_url && (
    <meta property="og:image" content={campaign.og_image_url} />
  )}
</Helmet>
```

---

### Nova Página: Configuração Geral

```
┌────────────────────────────────────────────────────────────┐
│  Configuração Geral                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  META TAGS DO SITE (Open Graph)                            │
│  ─────────────────────────────────                         │
│                                                            │
│  Título (og:title):                                        │
│  ┌──────────────────────────────────────────┐              │
│  │ Martech Efí Bank                         │              │
│  └──────────────────────────────────────────┘              │
│                                                            │
│  Descrição (og:description):                               │
│  ┌──────────────────────────────────────────┐              │
│  │ Plataforma de marketing digital          │              │
│  │ do Efí Bank                              │              │
│  └──────────────────────────────────────────┘              │
│                                                            │
│  Imagem de Preview:                                        │
│  ┌───────────────────┐                                     │
│  │    [Imagem]       │  [Trocar Imagem]                    │
│  │                   │                                     │
│  └───────────────────┘                                     │
│  Recomendado: 1200x630px                                   │
│                                                            │
│  Favicon:                                                  │
│  ┌───────┐                                                 │
│  │ [ico] │  [Trocar Favicon]                               │
│  └───────┘                                                 │
│                                                            │
│                            [Salvar Configurações]          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Seção SEO no Formulário de Campanha

Adicionar ao `CampaignFormDialog.tsx`:

```
┌────────────────────────────────────────────────────────────┐
│  SEO & COMPARTILHAMENTO                                    │
│  ─────────────────────                                     │
│                                                            │
│  Título para compartilhamento:                             │
│  ┌──────────────────────────────────────────┐              │
│  │ Gere seu selo exclusivo!                 │              │
│  └──────────────────────────────────────────┘              │
│  Se vazio, usa o título da campanha                        │
│                                                            │
│  Descrição para compartilhamento:                          │
│  ┌──────────────────────────────────────────┐              │
│  │ Personalize sua foto com o selo          │              │
│  │ da campanha Selo Estratégia              │              │
│  └──────────────────────────────────────────┘              │
│                                                            │
│  Imagem de Preview:                                        │
│  ┌───────────────────┐                                     │
│  │    [Imagem]       │  [Upload]                           │
│  │  1200x630px       │                                     │
│  └───────────────────┘                                     │
│  Imagem mostrada ao compartilhar o link                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Hook: `useSiteSettings.ts`

```typescript
export interface SiteSettings {
  id: string;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  twitter_card: string;
  favicon_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useSiteSettings() {
  // Query para buscar configurações
  // Mutation para atualizar
  // Função para upload de imagem
}
```

---

### Limitação Importante

As meta tags da `index.html` (página raiz) são estáticas e definidas em build time. Para que as configurações do admin reflitam no `index.html`, seria necessário:

**Opção A (Recomendada)**: Usar `react-helmet` na página Index para sobrescrever as tags dinamicamente quando o JavaScript carrega.

**Opção B**: Server-side rendering (não disponível no Lovable).

A Opção A será implementada, mas crawlers que não executam JavaScript podem não ver as tags atualizadas.

---

### Resumo das Alterações

| Tipo | Arquivo/Recurso | Descrição |
|------|-----------------|-----------|
| SQL | Migration | Criar `site_settings` + adicionar colunas em `image_campaigns` |
| Novo | `src/pages/AdminSiteSettings.tsx` | Página de configuração geral |
| Novo | `src/hooks/useSiteSettings.ts` | Hook para configurações do site |
| Edição | `src/components/AdminSidebar.tsx` | Adicionar menu "Configuração Geral" |
| Edição | `src/App.tsx` | Adicionar rota `/admin/configuracao` |
| Edição | `src/hooks/useImageCampaigns.ts` | Adicionar campos og_* nas interfaces |
| Edição | `src/components/campaigns/CampaignFormDialog.tsx` | Adicionar seção SEO |
| Edição | `src/pages/ImageCampaignPublic.tsx` | Injetar meta tags via Helmet |
| Edição | `src/pages/Index.tsx` | Injetar meta tags via Helmet |

---

### Fluxo de Funcionamento

1. Admin acessa `/admin/configuracao` e define meta tags globais
2. Admin cria/edita campanha e define meta tags específicas (opcional)
3. Quando usuário acessa `/gerar/selo-estrategia`:
   - Helmet injeta as meta tags da campanha
   - Se og_title não definido, usa título da campanha
   - Se og_image não definido, pode usar logo ou background como fallback
4. Quando usuário compartilha o link, a preview mostra as informações corretas

