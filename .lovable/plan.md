

# Raio-X: Migração do Efi Link (`/efi-link`)

## Arquitetura do Feature

```text
┌─────────────────────────────────────────────────────┐
│  FRONTEND                                           │
│                                                     │
│  src/pages/EfiLink.tsx          ← Página principal  │
│  src/components/efilink/                            │
│    ├── EfiLinkFormModal.tsx     ← Modal criar/editar│
│    └── QRCodeModal.tsx          ← Modal QR Code     │
│  src/hooks/useEfiLinks.ts       ← CRUD + lógica URL│
│  src/lib/extensionProxy.ts      ← Proxy p/ extensão│
│                                                     │
│  Rota: /efi-link (protegida, com AppLayout)         │
├─────────────────────────────────────────────────────┤
│  BANCO DE DADOS: tabela efi_links                   │
│                                                     │
│  Colunas:                                           │
│    id, user_id, link_pattern (onelink|sejaefi),     │
│    url_destino, deeplink, deeplink_param,           │
│    utm_source/medium/campaign/content/term,         │
│    pid, af_channel, c, af_adset, af_ad,             │
│    original_url, shortened_url, shortened_code,     │
│    name, created_at, updated_at                     │
│                                                     │
│  RLS: SELECT/UPDATE/DELETE → authenticated + true   │
│       INSERT → auth.uid() = user_id                 │
├─────────────────────────────────────────────────────┤
│  CHROME EXTENSION (encurtamento via proxy)          │
│    action: SHORTEN_URL → api.sejaefi.link/shorten   │
│    + CHECK_EXTENSION                                │
└─────────────────────────────────────────────────────┘
```

## O que precisa migrar

### 1. Tabela `efi_links` (SQL)
```sql
CREATE TABLE public.efi_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  link_pattern text NOT NULL DEFAULT 'onelink', -- 'onelink' | 'sejaefi'
  url_destino text NOT NULL,
  deeplink text,
  deeplink_param text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  pid text, af_channel text, c text, af_adset text, af_ad text,
  original_url text,
  shortened_url text,
  shortened_code text,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.efi_links ENABLE ROW LEVEL SECURITY;

-- RLS: qualquer autenticado pode ver/editar/deletar tudo (colaboração)
CREATE POLICY "select" ON public.efi_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert" ON public.efi_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update" ON public.efi_links FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete" ON public.efi_links FOR DELETE TO authenticated USING (true);
```

### 2. Arquivos Frontend (4 arquivos)
| Arquivo | Função |
|---------|--------|
| `src/pages/EfiLink.tsx` | Página com listagem, filtros, CRUD |
| `src/components/efilink/EfiLinkFormModal.tsx` | Modal de criação/edição com radio (onelink/sejaefi), UTM auto-sync para AppsFlyer |
| `src/components/efilink/QRCodeModal.tsx` | Geração de QR Code local (SVG/PNG) via lib `qrcode` |
| `src/hooks/useEfiLinks.ts` | React Query hooks (useEfiLinks, useCreateEfiLink, useUpdateEfiLink, useDeleteEfiLink) + `generateFullUrl()` |

### 3. Dependência: Chrome Extension Proxy
O encurtamento de URL (`SHORTEN_URL`) e a detecção da extensão usam `src/lib/extensionProxy.ts`. O endpoint real é `https://api.sejaefi.link/shorten` (sem auth), chamado via `background.js` da extensão.

Se não quiser depender da extensão, pode chamar `https://api.sejaefi.link/shorten` diretamente (é open, sem auth) via edge function ou fetch direto.

### 4. Dependências NPM
- `qrcode` — geração de QR Code (SVG e PNG)
- `date-fns` — formatação de datas
- `@tanstack/react-query` — gerenciamento de estado server-side
- `sonner` — toast notifications
- UI components: shadcn/ui (Dialog, Table, Badge, RadioGroup, AlertDialog, Select, Input, Button, Label)

### 5. Rota no App.tsx
```tsx
<Route path="/efi-link" element={<ProtectedRoute><AppLayout><EfiLink /></AppLayout></ProtectedRoute>} />
```

### 6. Dados existentes
Para exportar os dados atuais da tabela `efi_links`, pode-se usar uma query direta ou criar uma edge function de export similar à que fizemos para Efimagem.

---

**Resumo**: São 4 arquivos de código + 1 arquivo de proxy (opcional) + 1 tabela SQL + 1 lib npm (`qrcode`). Feature autocontida e simples de migrar.

