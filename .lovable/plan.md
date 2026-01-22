

## Plano: Adicionar Thumbnail para Assets de Campanha

### Objetivo

Adicionar uma imagem de **thumbnail** separada para cada asset de campanha de imagem. Esta thumbnail será exibida na página pública `/gerar/:slug` para o usuário selecionar o selo, enquanto a `image_url` original continuará sendo usada para aplicar o selo na foto.

---

### Fluxo Visual

```
┌─────────────────────────────────────────────────────┐
│          Admin: Gerenciar Assets                    │
├─────────────────────────────────────────────────────┤
│  [Imagem do Selo] → image_url (obrigatória)        │
│  [Thumbnail]      → thumbnail_url (opcional)        │
│                                                     │
│  Se thumbnail não existir, usa image_url            │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│          Página Pública: /gerar/:slug               │
├─────────────────────────────────────────────────────┤
│  Exibe: thumbnail_url OU image_url (fallback)      │
│  Aplica: image_url (sempre)                        │
└─────────────────────────────────────────────────────┘
```

---

### Alterações Necessárias

#### 1. Banco de Dados: Adicionar coluna `thumbnail_url`

**Migração SQL:**

```sql
ALTER TABLE public.image_campaign_assets 
ADD COLUMN thumbnail_url TEXT;

COMMENT ON COLUMN public.image_campaign_assets.thumbnail_url IS 
'URL da imagem de thumbnail para exibição na seleção. Se nulo, usa image_url.';
```

---

#### 2. Hook: Atualizar Interfaces TypeScript

**Arquivo:** `src/hooks/useImageCampaigns.ts`

```typescript
export interface ImageCampaignAsset {
  id: string;
  campaign_id: string;
  image_url: string;
  thumbnail_url: string | null;  // NOVO
  name: string;
  is_visible: boolean;
  position: number;
  created_at: string;
}

export interface CreateAssetData {
  campaign_id: string;
  image_url: string;
  thumbnail_url?: string;  // NOVO
  name: string;
  is_visible?: boolean;
  position?: number;
}

export interface UpdateAssetData {
  id: string;
  is_visible?: boolean;
  position?: number;
  name?: string;
  thumbnail_url?: string;  // NOVO
}
```

---

#### 3. Admin: Atualizar Gerenciador de Assets

**Arquivo:** `src/components/campaigns/CampaignAssetsManager.tsx`

**Alterações:**

| Elemento | Alteração |
|----------|-----------|
| Estado | Adicionar `thumbnailFile` para armazenar arquivo de thumbnail selecionado |
| Upload | Adicionar área de upload separada para thumbnail |
| Criação | Fazer upload de ambas imagens (selo e thumbnail) |
| Exibição | Mostrar thumbnail na lista de assets (se existir) |

**UI do formulário de upload:**

```
┌───────────────────────────────────────────────────────┐
│  Adicionar Asset                                      │
├───────────────────────────────────────────────────────┤
│  Nome do Asset: [________________]                   │
│                                                       │
│  ┌───────────────┐  ┌───────────────┐                │
│  │ Imagem Selo   │  │  Thumbnail    │                │
│  │  (Obrigatório)│  │  (Opcional)   │                │
│  │ [Selecionar]  │  │ [Selecionar]  │                │
│  └───────────────┘  └───────────────┘                │
│                                                       │
│  ☐ Visível para usuários                             │
│                                                       │
│  [      Adicionar Asset      ]                       │
└───────────────────────────────────────────────────────┘
```

---

#### 4. Página Pública: Usar Thumbnail na Exibição

**Arquivo:** `src/pages/ImageCampaignPublic.tsx`

**Alteração na renderização dos selos (linha ~474):**

```typescript
// ANTES
<img src={asset.image_url} alt={asset.name} />

// DEPOIS
<img 
  src={asset.thumbnail_url || asset.image_url} 
  alt={asset.name} 
/>
```

---

### Resumo das Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| Migração SQL | Banco | Adicionar coluna `thumbnail_url` |
| `src/hooks/useImageCampaigns.ts` | TypeScript | Atualizar interfaces |
| `src/components/campaigns/CampaignAssetsManager.tsx` | UI Admin | Adicionar upload de thumbnail |
| `src/pages/ImageCampaignPublic.tsx` | UI Pública | Usar thumbnail para exibição |

---

### Comportamento

1. **Upload no Admin:** O administrador pode enviar duas imagens separadas - o selo real e uma thumbnail
2. **Thumbnail opcional:** Se não for enviada, a página pública usará a `image_url` como fallback
3. **Geração:** A imagem do selo (`image_url`) continua sendo usada para aplicar na foto do usuário
4. **Exibição:** A thumbnail é usada apenas para mostrar as opções de seleção na página pública

