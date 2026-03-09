# Módulo Jira Tasks — Documentação Técnica

> Documento gerado para migração/reconstrução do módulo. Contém arquitetura, schemas, endpoints, lógica de negócio e trechos de código.

---

## 1. Arquitetura Geral

```
┌─────────────────────┐
│   Frontend (React)  │
│   React Query hooks │
└─────────┬───────────┘
          │ supabase.functions.invoke()
          │ supabase.from('table').select/insert/update
          ▼
┌─────────────────────┐     ┌──────────────────────────┐
│  Supabase Edge Fns  │────▶│  Jira Cloud REST API v3  │
│  (Deno, TypeScript) │◀────│  sejaefi.atlassian.net   │
└─────────┬───────────┘     └──────────────────────────┘
          │ service_role_key
          ▼
┌─────────────────────┐
│  Supabase Postgres  │
│  (4 tabelas)        │
└─────────────────────┘
```

**Fluxo principal:**
1. Usuário preenche formulário no frontend
2. Frontend chama Edge Function via `supabase.functions.invoke()`
3. Edge Function cria issue no Jira via REST API
4. Edge Function salva resultado no banco de dados
5. Frontend invalida cache do React Query para atualizar UI

---

## 2. Rotas e Páginas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/jira-tasks` | `JiraTasksDashboard` | Dashboard com métricas e tarefas recentes |
| `/jira-tasks/new` | `JiraTaskForm` | Formulário de criação de tarefa (do zero ou baseado em briefing) |
| `/jira-tasks/list` | `JiraTasksList` | Histórico completo com filtros, detalhes e deleção |
| `/jira-tasks/okrs` | `JiraOkrs` | CRUD de OKRs (cada OKR = 1 Épico no Jira) |
| `/admin/jira` | `AdminJira` | Admin: gerenciar áreas e subtarefas padrão |

Todas as rotas (exceto `/admin/jira`) usam `<ProtectedRoute><AppLayout>`. A rota admin usa `<ProtectedRoute>` com `AdminSidebar`.

---

## 3. Tabelas do Banco de Dados

### 3.1 `jira_tasks`

```sql
CREATE TABLE jira_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  jira_task_key   text,              -- Ex: "MAR-123"
  jira_okr_id     uuid REFERENCES jira_okrs(id),
  sprint_label    text,              -- Ex: "mar-s2"
  areas           text[] NOT NULL DEFAULT '{}',  -- Array de nomes de área
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'created' | 'failed'
  created_by      uuid NOT NULL REFERENCES profiles(id),
  jira_response   jsonb,             -- Resposta completa da API do Jira
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

**RLS:**
- `SELECT`: qualquer autenticado
- `INSERT`: `auth.uid() = created_by`
- `UPDATE`: qualquer autenticado
- `DELETE`: **não permitido via RLS** (deleção via Edge Function com service_role_key)

### 3.2 `jira_task_subtasks`

```sql
CREATE TABLE jira_task_subtasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_task_id      uuid NOT NULL REFERENCES jira_tasks(id),
  area_id           uuid REFERENCES jira_areas(id),
  subtask_name      text NOT NULL,
  jira_subtask_key  text,            -- Ex: "MAR-124"
  status            text NOT NULL DEFAULT 'pending',
  created_at        timestamptz DEFAULT now()
);
```

**RLS:**
- `SELECT` e `ALL`: qualquer autenticado (sem restrição)

### 3.3 `jira_okrs`

```sql
CREATE TABLE jira_okrs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  jira_epic_key   text,              -- Ex: "MAR-100"
  description     text,
  start_date      date,
  end_date        date,
  is_active       boolean DEFAULT true,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

**RLS:**
- `SELECT` e `UPDATE`: qualquer autenticado
- `INSERT`: `auth.uid() = created_by`
- `DELETE`: apenas admin (`has_role(auth.uid(), 'admin')`)

**Soft delete:** OKRs são desativados (`is_active = false`), não deletados.

### 3.4 `jira_areas`

```sql
CREATE TABLE jira_areas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,          -- Ex: "Produção"
  label             text NOT NULL,          -- Ex: "PROD" (usado como label no Jira)
  default_subtasks  jsonb NOT NULL DEFAULT '[]',  -- Array de strings
  display_order     integer DEFAULT 0,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
```

**RLS:**
- `SELECT` (is_active = true): qualquer um
- `ALL`: apenas admin

**Soft delete:** Áreas são desativadas, não deletadas.

---

## 4. Edge Functions

### 4.1 `create-jira-task`

**Arquivo:** `supabase/functions/create-jira-task/index.ts`

**Input (body JSON):**
```typescript
interface CreateTaskRequest {
  title: string;
  description?: string;       // HTML do RichTextEditor
  jira_okr_id?: string;       // UUID do OKR para vincular ao épico
  sprint_label?: string;      // Ex: "mar-s2"
  areas: string[];            // Nomes das áreas selecionadas
  subtasks: {
    area_id: string;
    area_label: string;        // Label da área (usado como Jira label)
    subtask_names: string[];   // Lista de nomes de subtarefas
  }[];
  user_id: string;            // UUID do usuário autenticado
}
```

**Lógica:**
1. Se `jira_okr_id` fornecido, busca `jira_epic_key` do OKR no banco
2. Converte `description` (HTML) para **Atlassian Document Format (ADF)** via função `htmlToAdf()`
3. Cria issue principal no Jira:
   - **Projeto:** `MAR`
   - **Issue type:** `Esteira` (tipo customizado)
   - **Labels:** `[sprint_label]`
   - **Parent:** épico do OKR (se disponível)
4. Salva tarefa no banco com status `created`
5. Para cada área/subtarefa, cria subtask no Jira:
   - **Issue type:** ID `10011` (Subtask)
   - **Parent:** key da tarefa principal
   - **Labels:** `[area_label, sprint_label]`
   - **Description:** `"Subtarefa da área {area_label}"`
6. Salva cada subtarefa no banco (status `created` ou `failed`)

**Output:**
```typescript
{
  success: true,
  task: {
    id: string,      // UUID no banco
    key: string,     // Ex: "MAR-123"
    url: string,     // "https://sejaefi.atlassian.net/browse/MAR-123"
  },
  subtasks: {
    created: { name: string, key: string, area: string }[],
    failed: { name: string, error: string }[],
  }
}
```

### 4.2 `delete-jira-task`

**Arquivo:** `supabase/functions/delete-jira-task/index.ts`

**Input (body JSON):**
```typescript
// Deletar tarefa completa:
{ taskId: string }

// OU deletar apenas uma subtarefa:
{ subtaskId: string }
```

**Lógica:**
- **Deletar tarefa:** busca todas subtarefas → deleta cada uma no Jira → deleta tarefa principal no Jira (`?deleteSubtasks=true`) → deleta registros do banco
- **Deletar subtarefa:** busca key → deleta no Jira → deleta do banco
- Usa `DELETE /rest/api/3/issue/{issueKey}?deleteSubtasks=true`
- Se issue não encontrada no Jira (404), continua com deleção do banco
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypassar RLS na deleção

### 4.3 `create-jira-epic`

**Arquivo:** `supabase/functions/create-jira-epic/index.ts`

**Input:**
```typescript
{ name: string; description?: string }
```

**Lógica:**
1. Cria issue no Jira com tipo `Epic` no projeto `MAR`
2. Description convertida para ADF (formato simples, apenas parágrafo)

**Output:**
```typescript
{ success: true, epic_key: "MAR-100", epic_id: "12345", epic_url: "..." }
```

### 4.4 `jira-login`

**Arquivo:** `supabase/functions/jira-login/index.ts`

**Propósito:** Autenticação baseada em Jira. Não é específico do módulo de tasks, mas é a porta de entrada.

**Input:** `{ email: string }`

**Lógica:**
1. Busca usuário no Jira por email (2 métodos: busca direta + fallback bulk)
2. Se não encontrado → acesso negado
3. Gera senha derivada: `SHA-256(email:JIRA_LOGIN_SECRET:jira-auth-v1)` → hex string de 64 chars
4. Se usuário não existe no Supabase → cria conta com `admin.createUser()`
5. Se existe → atualiza senha para a derivada
6. Retorna `{ success, derivedPassword, userData }` para o frontend fazer `signInWithPassword()`

---

## 5. Jira Cloud API — Detalhes

### Base URL
```
https://sejaefi.atlassian.net
```

### Autenticação
```
Basic Auth: btoa(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`)
```

### Projeto
```
Key: MAR
```

### Endpoints Utilizados

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/rest/api/3/issue` | Criar issue (task, subtask, epic) |
| `DELETE` | `/rest/api/3/issue/{key}?deleteSubtasks=true` | Deletar issue |
| `GET` | `/rest/api/3/user/search?query={email}` | Buscar usuário por email |
| `GET` | `/rest/api/3/users/search?maxResults=1000` | Listar todos usuários (fallback) |

### Issue Types

| Nome | ID | Uso |
|------|-----|-----|
| `Esteira` | (por nome) | Tarefa principal |
| Subtask | `10011` | Subtarefas |
| `Epic` | (por nome) | OKRs/Épicos |

### Payload — Criar Tarefa Principal
```json
{
  "fields": {
    "project": { "key": "MAR" },
    "summary": "Título da tarefa",
    "description": { "type": "doc", "version": 1, "content": [...] },
    "issuetype": { "name": "Esteira" },
    "labels": ["mar-s2"],
    "parent": { "key": "MAR-100" }
  }
}
```

### Payload — Criar Subtarefa
```json
{
  "fields": {
    "project": { "key": "MAR" },
    "parent": { "key": "MAR-123" },
    "summary": "Nome da subtarefa",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Subtarefa da área PROD" }] }]
    },
    "issuetype": { "id": "10011" },
    "labels": ["PROD", "mar-s2"]
  }
}
```

---

## 6. Secrets / Variáveis de Ambiente

| Secret | Descrição | Usado em |
|--------|-----------|----------|
| `JIRA_API_TOKEN` | API Token do Jira Cloud | `create-jira-task`, `delete-jira-task`, `create-jira-epic`, `jira-login` |
| `JIRA_USER_EMAIL` | Email do admin Jira (para Basic Auth) | `create-jira-task`, `delete-jira-task`, `create-jira-epic` |
| `JIRA_LOGIN_SECRET` | Salt para gerar senha derivada | `jira-login` |
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso admin ao banco | Todas edge functions |
| `SUPABASE_URL` | URL do projeto Supabase | Todas edge functions |

> **Nota:** No `jira-login`, o email admin do Jira está hardcoded como `fabio.leme@sejaefi.com.br` (diferente das outras functions que usam `JIRA_USER_EMAIL`).

---

## 7. Hooks (React Query)

**Arquivo:** `src/hooks/useJiraTasks.ts`

### Queries

| Hook | Query Key | Tabela/Fonte | Descrição |
|------|-----------|-------------|-----------|
| `useJiraOkrs()` | `["jira-okrs"]` | `jira_okrs` (is_active=true) | Lista OKRs ativos |
| `useJiraAreas()` | `["jira-areas"]` | `jira_areas` (is_active=true, order by display_order) | Lista áreas ativas |
| `useJiraTasks()` | `["jira-tasks"]` | `jira_tasks` com join em `jira_okrs` | Lista todas as tarefas |
| `useJiraTaskWithSubtasks(id)` | `["jira-task", id]` | `jira_tasks` + `jira_task_subtasks` com joins | Detalhes + subtarefas |
| `useJiraTasksMetrics()` | `["jira-tasks-metrics"]` | `jira_tasks` (select id, status, created_at, areas) | Métricas calculadas no frontend |

### Mutations

| Hook | Edge Function / Tabela | Ação |
|------|----------------------|------|
| `useCreateJiraOkr()` | `create-jira-epic` → insert `jira_okrs` | Cria épico no Jira + salva OKR |
| `useUpdateJiraOkr()` | update `jira_okrs` | Atualiza OKR (só banco, não atualiza Jira) |
| `useDeleteJiraOkr()` | update `jira_okrs` set is_active=false | Soft delete |
| `useCreateJiraTask()` | `create-jira-task` | Cria tarefa + subtarefas no Jira e banco |
| `useDeleteJiraTask()` | `delete-jira-task` (body: {taskId}) | Deleta tarefa + subtarefas |
| `useDeleteJiraSubtask()` | `delete-jira-task` (body: {subtaskId}) | Deleta subtarefa individual |
| `useCreateJiraArea()` | insert `jira_areas` | Cria área |
| `useUpdateJiraArea()` | update `jira_areas` | Atualiza área |
| `useDeleteJiraArea()` | update `jira_areas` set is_active=false | Soft delete |

---

## 8. Types (TypeScript)

**Arquivo:** `src/types/jiraTask.ts`

```typescript
export interface JiraOkr {
  id: string;
  name: string;
  jira_epic_key: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JiraArea {
  id: string;
  name: string;
  label: string;
  default_subtasks: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JiraTask {
  id: string;
  title: string;
  description: string | null;
  jira_task_key: string | null;
  jira_okr_id: string | null;
  sprint_label: string | null;
  areas: string[];
  status: 'pending' | 'created' | 'failed';
  created_by: string;
  created_at: string;
  updated_at: string;
  jira_response: Record<string, unknown> | null;
  jira_okr?: JiraOkr | null;
}

export interface JiraTaskSubtask {
  id: string;
  jira_task_id: string;
  area_id: string | null;
  subtask_name: string;
  jira_subtask_key: string | null;
  status: 'pending' | 'created' | 'failed';
  created_at: string;
  jira_area?: JiraArea | null;
}

export interface CreateJiraTaskInput {
  title: string;
  description?: string;
  jira_okr_id?: string;
  sprint_label?: string;
  areas: string[];
  subtasks: {
    area_id: string;
    area_label: string;
    subtask_names: string[];
  }[];
}

export interface CreateJiraOkrInput {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}
```

---

## 9. Trechos de Código Relevantes

### 9.1 Conversor HTML → ADF (Atlassian Document Format)

Usado na Edge Function `create-jira-task` para converter o HTML do `RichTextEditor` para o formato exigido pela API do Jira v3.

```typescript
function htmlToAdf(html: string): object {
  if (!html || !html.trim()) {
    return {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "Tarefa criada via Efi Tools" }] }]
    };
  }

  const content: any[] = [];
  
  // Split by HTML tags while preserving them
  const parts = html.split(/(<h1>|<\/h1>|<h2>|<\/h2>|<p>|<\/p>|<ul>|<\/ul>|<ol>|<\/ol>|<li>|<\/li>|<strong>|<\/strong>|<b>|<\/b>|<em>|<\/em>|<i>|<\/i>|<br\s*\/?>)/gi);
  
  let currentParagraph: any[] = [];
  let currentList: any[] = [];
  let listType: "bulletList" | "orderedList" | null = null;
  let inHeading = false;
  let headingLevel = 1;
  let isBold = false;
  let isItalic = false;

  // ... (parser de tags HTML para nós ADF)
  // Suporta: h1, h2, p, ul, ol, li, strong/b, em/i, br
  // Entidades HTML decodificadas: &nbsp; &amp; &lt; &gt; &quot;
  
  return { type: "doc", version: 1, content };
}
```

**Tags ADF geradas:** `doc`, `paragraph`, `heading` (com attrs.level), `bulletList`, `orderedList`, `listItem`, `text` (com marks: `strong`, `em`), `hardBreak`

### 9.2 Gerador de Sprint Labels

```typescript
// Gera labels como "jan-s3" (janeiro, semana 3)
export function generateSprintLabel(date: Date = new Date()): string {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const month = months[date.getMonth()];
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${month}-s${weekOfMonth}`;
}

// Retorna opções de sprint (semana anterior até +4 semanas)
export function getSprintOptions(): { label: string; value: string }[] {
  const options = [];
  const today = new Date();
  
  for (let i = -1; i <= 4; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + (i * 7));
    const label = generateSprintLabel(date);
    const displayLabel = i === 0 ? `${label} (atual)` : label;
    
    if (!options.find(o => o.value === label)) {
      options.push({ label: displayLabel, value: label });
    }
  }
  return options;
}
```

### 9.3 Briefing → Tarefa (conversão de dados)

Quando o usuário cria uma tarefa a partir de um briefing existente, o conteúdo é convertido para HTML:

```typescript
const formatBriefingToHtml = (briefing: Briefing): string => {
  const sections = [
    { label: "Objetivo Final", value: briefing.objetivo_final },
    { label: "Ação Desejada", value: briefing.acao_desejada },
    { label: "Tela de Destino", value: briefing.tela_destino },
    { label: "Motivo da Demanda", value: briefing.motivo_demanda },
    // ... (24 campos no total)
  ];

  return sections
    .filter(s => s.value)
    .map(s => `<h2>${s.label}</h2><p>${s.value}</p>`)
    .join("");
};
```

Esse HTML é depois convertido para ADF pela Edge Function.

### 9.4 Senha Derivada (Login)

```typescript
async function generateDerivedPassword(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${email.toLowerCase()}:${secret}:jira-auth-v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Retorna hex string de 64 caracteres
}
```

---

## 10. Componentes Auxiliares

### `OperationProgressModal`

**Arquivo:** `src/components/jira/OperationProgressModal.tsx`

Modal reutilizável para feedback de operações longas (criar/deletar tarefas).

```typescript
interface OperationProgressModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  status: "loading" | "success" | "error";
  details?: string[];    // Lista de bullets com progresso
  onClose?: () => void;
  onRetry?: () => void;  // Botão "Tentar Novamente" em caso de erro
}
```

- Enquanto `status === "loading"`: modal não pode ser fechado (block escape/click outside)
- `status === "success"`: ícone verde + botão fechar
- `status === "error"`: ícone vermelho + botão retry (se callback fornecido)

### `RichTextEditor`

Usado no formulário de criação de tarefa para editar a descrição em HTML rico. O HTML gerado é enviado para a Edge Function que converte para ADF.

---

## 11. Fluxo Completo — Criar Tarefa

```
1. Usuário abre /jira-tasks/new
2. Escolhe: "do zero" ou "baseado em briefing"
3. Se briefing: seleciona briefing → campos preenchidos automaticamente (título + descrição HTML)
4. Seleciona OKR (opcional) → será vinculado ao épico
5. Seleciona sprint label (default: semana atual)
6. Seleciona áreas → subtarefas padrão carregadas automaticamente
7. Pode adicionar/remover subtarefas individuais
8. Submete → OperationProgressModal abre (loading)
9. useCreateJiraTask.mutateAsync() → Edge Function create-jira-task:
   a. Busca epic_key do OKR (se fornecido)
   b. Converte HTML → ADF
   c. POST /rest/api/3/issue (tarefa principal)
   d. INSERT jira_tasks (status: 'created')
   e. Para cada subtarefa: POST /rest/api/3/issue + INSERT jira_task_subtasks
10. Resposta → Modal atualiza (success/error)
11. Tela de sucesso com link para abrir no Jira
```

---

## 12. Fluxo Completo — Deletar Tarefa

```
1. Usuário clica 🗑️ na lista ou no modal de detalhes
2. AlertDialog de confirmação
3. OperationProgressModal abre (loading)
4. useDeleteJiraTask.mutateAsync(taskId) → Edge Function delete-jira-task:
   a. Busca jira_task_key da tarefa
   b. Busca todas subtarefas com jira_subtask_key
   c. DELETE cada subtarefa no Jira
   d. DELETE tarefa principal no Jira (?deleteSubtasks=true)
   e. DELETE subtarefas do banco
   f. DELETE tarefa do banco
5. Modal atualiza (success/error)
6. React Query invalida cache → lista atualiza
```

---

## 13. Métricas (Dashboard)

Calculadas **no frontend** a partir de query simples:

```typescript
const { data } = await supabase
  .from("jira_tasks")
  .select("id, status, created_at, areas");

// Métricas:
// - total: data.length
// - created: filter(status === 'created')
// - failed: filter(status === 'failed')
// - thisMonth: filter(created_at >= 1o dia do mês)
// - thisWeek: filter(created_at >= domingo da semana)
// - byArea: contagem por área (flatten do array areas)
```

---

## 14. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| State/Cache | TanStack React Query v5 |
| Auth State | Zustand (`authStore`) |
| Backend | Supabase (Postgres + Edge Functions + Auth) |
| Edge Functions | Deno runtime |
| API Externa | Jira Cloud REST API v3 |
| Rich Text | RichTextEditor customizado (HTML) |
| Datas | date-fns com locale pt-BR |
