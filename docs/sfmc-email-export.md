# Como Enviar Email para o Salesforce Marketing Cloud (SFMC)

Documentação completa para reproduzir o fluxo de exportação de emails do Email Builder para o SFMC.

---

## 1. Arquitetura Geral

### Problema
O IP do servidor (Edge Functions / Supabase) é bloqueado pelo SFMC, impedindo chamadas diretas à API REST.

### Solução
Uma **Chrome Extension** atua como proxy OAuth2, aproveitando a sessão do navegador do usuário (que tem IP liberado) para fazer as chamadas à API SFMC.

### Fluxo de comunicação
```
Frontend (React)
    │
    │  window.postMessage({ target: 'SFMC_PROXY', requestId, action, payload })
    ▼
Content Script (content.js) — injetado na página
    │
    │  chrome.runtime.sendMessage({ type: 'SFMC_PROXY_REQUEST', action, payload })
    ▼
Background Service Worker (background.js)
    │
    │  fetch() direto para SFMC REST API
    ▼
SFMC REST API (*.marketingcloudapis.com)
    │
    │  Response JSON
    ▼
Background → Content Script → window.postMessage({ target: 'SFMC_PROXY_RESPONSE', requestId, response })
    │
    ▼
Frontend recebe a resposta
```

---

## 2. Chrome Extension — 3 Arquivos Principais

### 2.1 manifest.json

```json
{
  "manifest_version": 3,
  "name": "Mágicas do Fábio",
  "version": "1.0.1",
  "permissions": ["storage", "declarativeNetRequest"],
  "host_permissions": [
    "https://*.exacttargetapis.com/*",
    "https://*.salesforce.com/*",
    "https://*.marketingcloudapis.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.lovable.app/*",
        "*://*.lovable.dev/*",
        "*://*.lovableproject.com/*",
        "http://localhost:*/*"
      ],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

**Pontos-chave:**
- `content_scripts.matches`: define em quais domínios o content script é injetado (deve incluir o domínio da aplicação)
- `host_permissions`: permite que o background faça fetch para os domínios do SFMC
- `run_at: "document_start"`: garante que o content script esteja disponível antes do app carregar

### 2.2 content.js — Ponte bidirecional

O content script é a ponte entre a página web (que não tem acesso a `chrome.runtime`) e o background (que não tem acesso ao DOM).

```javascript
// Verifica se o contexto da extensão ainda é válido
function isExtensionContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// Escuta mensagens da página web
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.target !== 'SFMC_PROXY') return;

  const { requestId, action, payload } = event.data;

  if (!isExtensionContextValid()) {
    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: { 
        success: false, 
        error: 'Contexto da extensão perdido. Recarregue a página (F5).' 
      }
    }, '*');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SFMC_PROXY_REQUEST',
      action: action,
      payload: payload
    });

    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: response
    }, '*');
  } catch (error) {
    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: { success: false, error: error.message }
    }, '*');
  }
});

// Notifica a página que a extensão está disponível
if (isExtensionContextValid()) {
  window.postMessage({ target: 'SFMC_PROXY_READY', version: '1.0.0' }, '*');
}
```

**Pontos-chave:**
- `SFMC_PROXY_READY`: evento emitido quando o content script é injetado, permitindo detecção imediata
- `isExtensionContextValid()`: detecta quando a extensão foi atualizada/recarregada (contexto invalidado)
- O `requestId` é passado ida e volta para correlacionar request/response

### 2.3 background.js — Service Worker com OAuth2 e API calls

#### Credenciais OAuth2

```javascript
const SFMC_CREDENTIALS = {
  clientId: "<CLIENT_ID>",
  clientSecret: "<CLIENT_SECRET>",
  authUri: "https://<SUBDOMAIN>.auth.marketingcloudapis.com",
  subdomain: "<SUBDOMAIN>",
};
```

#### Token Cache (TTL 30min - 5min de segurança = 25min efetivo)

```javascript
let tokenCache = {
  accessToken: null,
  restInstanceUrl: null,
  expiresAt: null,
};

async function getSfmcAccessToken() {
  // Verifica cache
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return { accessToken: tokenCache.accessToken, restInstanceUrl: tokenCache.restInstanceUrl };
  }

  const authUrl = `${SFMC_CREDENTIALS.authUri}/v2/token`;

  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: SFMC_CREDENTIALS.clientId,
      client_secret: SFMC_CREDENTIALS.clientSecret,
    }),
  });

  const data = await response.json();

  // Cache com margem de segurança de 5 minutos
  tokenCache = {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url,  // Ex: "https://mcn3dvqncqsps20bqzd6yb8r97ty.rest.marketingcloudapis.com/"
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return { accessToken: data.access_token, restInstanceUrl: data.rest_instance_url };
}
```

**Resposta do `/v2/token`:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 1079,
  "rest_instance_url": "https://<SUBDOMAIN>.rest.marketingcloudapis.com/",
  "soap_instance_url": "https://<SUBDOMAIN>.soap.marketingcloudapis.com/"
}
```

#### Ações disponíveis no message listener

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SFMC_PROXY_REQUEST") return false;

  const handleRequest = async () => {
    switch (message.action) {
      case "CHECK_EXTENSION":
        return { success: true, configured: true };

      case "UPLOAD_ASSET":
        return await uploadAssetToSfmc(message.payload);

      case "LIST_EMAILS":
        return await listEmailsFromSfmc(payload.page, payload.pageSize, payload.search, payload.categoryId);

      case "GET_EMAIL":
        return await getEmailFromSfmc(payload.assetId);

      case "DELETE_EMAIL":
        return await deleteEmailFromSfmc(payload.assetId);

      case "UPDATE_ASSET":
        return await updateAssetInSfmc(payload.assetId, payload.assetData);

      case "LIST_CATEGORIES":
        return await listCategoriesFromSfmc();

      case "MOVE_ASSET":
        return await moveAssetToCategory(payload.assetId, payload.categoryId);
    }
  };

  handleRequest().then(sendResponse);
  return true; // Indica resposta assíncrona
});
```

---

## 3. API SFMC — Endpoints Utilizados

Base URL: `{rest_instance_url}` (obtida do token OAuth2, ex: `https://mcn3dvqncqsps20bqzd6yb8r97ty.rest.marketingcloudapis.com/`)

| Ação | Método | Endpoint | Descrição |
|------|--------|----------|-----------|
| Upload Asset | POST | `/asset/v1/content/assets` | Cria imagem ou email HTML |
| Listar Emails | POST | `/asset/v1/content/assets/query` | Query com filtros por assetType |
| Buscar Email | GET | `/asset/v1/content/assets/{id}` | Retorna conteúdo completo |
| Deletar Asset | DELETE | `/asset/v1/content/assets/{id}` | Remove asset |
| Atualizar Asset | PATCH | `/asset/v1/content/assets/{id}` | Atualiza campos do asset |
| Listar Categorias | GET | `/asset/v1/content/categories` | Lista pastas/categorias |

### Asset Types relevantes

| ID | Nome | Uso |
|----|------|-----|
| 22 | jpeg | Upload de imagem JPEG |
| 23 | gif | Upload de imagem GIF |
| 28 | png | Upload de imagem PNG |
| 205 | webpage | Cloud Pages (sites) |
| 207 | templatebasedemail | Email baseado em template |
| 208 | htmlemail | Email HTML puro |
| 209 | textonlyemail | Email texto |

### Categorias (Pastas) usadas

| ID | Uso |
|----|-----|
| 93941 | Pasta de imagens de email |
| 93810 | Pasta de emails HTML |

---

## 4. Fluxo Completo de Export — `handleExportToMC`

### Passo 1: Verificar extensão

```typescript
const checkExtension = async (): Promise<boolean> => {
  try {
    const response = await sendToExtension('CHECK_EXTENSION');
    return response.configured === true;
  } catch {
    return false;
  }
};
```

### Passo 2: Gerar HTML final do email

```typescript
const htmlContent = selectedBlocks
  .map(block => block.customHtml || block.html_template)
  .join('\n');
```

O email é composto por blocos HTML concatenados. Cada bloco pode ter HTML customizado (`customHtml`) ou usar o template original (`html_template`).

### Passo 3: Extrair e converter imagens para base64

```typescript
const extractAndConvertImages = async (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');
  const images = [];
  const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();

  for (const img of Array.from(imgElements)) {
    const src = img.getAttribute('src');
    
    // Pular: data URIs, imagens já hospedadas no SFMC
    if (!src || src.startsWith('data:') || src.includes('image.comunicacao.sejaefi.com.br')) continue;

    const response = await fetch(src);
    const blob = await response.blob();
    const extension = blob.type.split('/')[1] || 'jpeg';
    const originalName = src.split('/').pop()?.split('?')[0] || `image-${Date.now()}`;
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}-${uniqueSuffix}.${extension === 'jpg' ? 'jpeg' : extension}`;
    
    // CustomerKey DEVE ter no máximo 36 caracteres (limitação SFMC)
    const customerKey = `img_${Date.now().toString(36)}_${uniqueSuffix}`;

    images.push({ blob, newName, customerKey });

    // Substituir src pela URL final no SFMC
    const newUrl = `https://image.comunicacao.sejaefi.com.br/lib/fe4111737764047d751573/m/1/${newName}`;
    img.setAttribute('src', newUrl);
  }

  return { images, updatedHtml: doc.body.innerHTML };
};
```

**IMPORTANTE — customerKey:**
- O SFMC exige que `customerKey` tenha **no máximo 36 caracteres**
- Formato usado: `img_[base36timestamp]_[4digitSuffix]` (≈18 chars)
- Se exceder 36 chars, o upload falha com erro silencioso

**IMPORTANTE — URL das imagens:**
- Após upload, as imagens ficam acessíveis via `https://image.comunicacao.sejaefi.com.br/lib/fe4111737764047d751573/m/1/{fileName}`
- Este é o domínio de imagens configurado no SFMC para a conta Efi
- O HTML é atualizado com estas URLs antes de ser enviado

### Passo 4: Upload de cada imagem

Para cada imagem extraída:

```typescript
// Converter blob para base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]; // Remove o prefixo data:...;base64,
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64 = await blobToBase64(img.blob);
const extension = img.newName.split('.').pop()?.toLowerCase();

// Determinar assetType baseado na extensão
let assetTypeId = 22; // jpeg (padrão)
if (extension === 'png') assetTypeId = 28;
else if (extension === 'gif') assetTypeId = 23;
```

**Payload de upload de imagem:**
```json
{
  "assetType": { "name": "jpeg", "id": 22 },
  "name": "hero-image-4821.jpeg",
  "file": "<BASE64_STRING_SEM_PREFIXO>",
  "category": { "id": 93941 },
  "customerKey": "img_m2k5x8f_4821",
  "fileProperties": {
    "fileName": "hero-image-4821.jpeg",
    "extension": "jpeg"
  }
}
```

**Endpoint:** `POST /asset/v1/content/assets`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Resposta de sucesso:**
```json
{
  "id": 123456,
  "customerKey": "img_m2k5x8f_4821",
  "name": "hero-image-4821.jpeg",
  "fileProperties": {
    "publishedURL": "https://image.comunicacao.sejaefi.com.br/lib/.../hero-image-4821.jpeg"
  }
}
```

### Passo 5: Upload do HTML final

Após todas as imagens serem enviadas e o HTML atualizado com as novas URLs:

**Payload de upload de email HTML:**
```json
{
  "assetType": { "name": "htmlemail", "id": 208 },
  "name": "Nome do Email Template",
  "category": { "id": 93810 },
  "views": {
    "html": {
      "content": "<table>...HTML completo do email com URLs de imagens já atualizadas...</table>"
    },
    "subjectline": {
      "content": "Assunto do email"
    },
    "preheader": {
      "content": "Texto de preview do email"
    }
  }
}
```

**Endpoint:** `POST /asset/v1/content/assets`

**Resposta de sucesso:**
```json
{
  "id": 789012,
  "name": "Nome do Email Template",
  "assetType": { "id": 208, "name": "htmlemail" },
  "views": {
    "html": { "content": "..." },
    "subjectline": { "content": "Assunto do email" },
    "preheader": { "content": "Texto de preview" }
  }
}
```

### Passo 6 (opcional): Atualizar email existente

Para emails que já existem no SFMC (modo online / edição):

**Payload de atualização:**
```json
{
  "views": {
    "html": { "content": "<HTML atualizado>" },
    "subjectline": { "content": "Novo assunto" },
    "preheader": { "content": "Novo preview text" }
  }
}
```

**Endpoint:** `PATCH /asset/v1/content/assets/{assetId}`

---

## 5. Frontend Communication Pattern

### sendToExtension — Função de comunicação

```typescript
const sendToExtension = (action: string, payload?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random()}`;
    
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Extensão não respondeu (timeout 30s)'));
    }, 30000);

    const handler = (event: MessageEvent) => {
      if (event.data?.target !== 'SFMC_PROXY_RESPONSE') return;
      if (event.data?.requestId !== requestId) return;

      clearTimeout(timeout);
      window.removeEventListener('message', handler);

      if (event.data.response?.success) {
        resolve(event.data.response);
      } else {
        reject(new Error(event.data.response?.error || 'Erro desconhecido'));
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({
      target: 'SFMC_PROXY',
      requestId,
      action,
      payload
    }, '*');
  });
};
```

**Protocolo de mensagem:**
- **Request**: `{ target: 'SFMC_PROXY', requestId: string, action: string, payload?: any }`
- **Response**: `{ target: 'SFMC_PROXY_RESPONSE', requestId: string, response: { success: boolean, error?: string, ...data } }`
- **Ready event**: `{ target: 'SFMC_PROXY_READY', version: string }`

### Verificação de disponibilidade

```typescript
// Módulo utilitário (src/lib/extensionProxy.ts)
let extensionReady = false;

// Escuta evento de ready (emitido pelo content script ao carregar)
window.addEventListener('message', (event) => {
  if (event.data?.target === 'SFMC_PROXY_READY') {
    extensionReady = true;
  }
});

// Verificação ativa com timeout curto (3s)
async function checkExtensionInstalled(): Promise<boolean> {
  if (extensionReady) return true;
  
  return new Promise((resolve) => {
    const requestId = `check-${Date.now()}`;
    
    window.postMessage({
      target: 'SFMC_PROXY',
      requestId,
      action: 'CHECK_EXTENSION',
    }, '*');

    const handler = (event: MessageEvent) => {
      if (event.data?.target === 'SFMC_PROXY_RESPONSE' && event.data?.requestId === requestId) {
        window.removeEventListener('message', handler);
        extensionReady = true;
        resolve(true);
      }
    };

    window.addEventListener('message', handler);
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(extensionReady);
    }, 3000);
  });
}
```

---

## 6. Query para Listar Emails no SFMC

O endpoint de listagem usa POST com query JSON:

```json
{
  "page": { "page": 1, "pageSize": 25 },
  "query": {
    "leftOperand": {
      "property": "assetType.id",
      "simpleOperator": "greaterThanOrEqual",
      "value": 207
    },
    "logicalOperator": "AND",
    "rightOperand": {
      "property": "assetType.id",
      "simpleOperator": "lessThanOrEqual",
      "value": 209
    }
  },
  "sort": [{ "property": "modifiedDate", "direction": "DESC" }],
  "fields": ["id", "name", "assetType", "modifiedDate", "status", "customerKey", "category"]
}
```

**Com filtro de busca por nome:**
```json
{
  "query": {
    "leftOperand": { "...query base acima..." },
    "logicalOperator": "AND",
    "rightOperand": {
      "property": "name",
      "simpleOperator": "like",
      "value": "%termo de busca%"
    }
  }
}
```

**Com filtro de categoria/pasta:**
```json
{
  "rightOperand": {
    "property": "category.id",
    "simpleOperator": "equal",
    "value": 93810
  }
}
```

**Endpoint:** `POST /asset/v1/content/assets/query`

---

## 7. Mover Asset para outra Pasta

```json
// PATCH /asset/v1/content/assets/{assetId}
{
  "category": { "id": 12345 }
}
```

Para listar pastas disponíveis:
`GET /asset/v1/content/categories`

---

## 8. Resumo do Fluxo Completo

```
1. Usuário clica "Exportar para MC" no Email Builder
2. Frontend verifica extensão: sendToExtension('CHECK_EXTENSION')
3. Frontend gera HTML concatenando blocos selecionados
4. Frontend extrai todas as <img> do HTML
5. Para cada imagem:
   a. fetch(src) → blob
   b. blob → base64 (sem prefixo data:...)
   c. Gera customerKey curto (máx 36 chars)
   d. sendToExtension('UPLOAD_ASSET', { assetType, name, file, category, customerKey, fileProperties })
   e. Atualiza src no HTML para URL do SFMC
6. Frontend envia HTML final:
   sendToExtension('UPLOAD_ASSET', { assetType: {name:'htmlemail', id:208}, name, category, views: {html, subjectline, preheader} })
7. Toast de sucesso ao usuário
```

---

## 9. Tratamento de Erros

| Cenário | Detecção | Ação |
|---------|----------|------|
| Extensão não instalada | `checkExtension()` timeout 3s | Toast: "Instale a extensão" |
| Contexto invalidado | `isExtensionContextValid()` retorna false | Toast: "Recarregue a página (F5)" |
| Token expirado | 401 no fetch SFMC | `getSfmcAccessToken()` renova automaticamente |
| customerKey > 36 chars | SFMC retorna erro | Usar formato `img_[base36]_[suffix]` |
| Timeout 30s | setTimeout no sendToExtension | reject com erro de timeout |
| Imagem inacessível | fetch(src) falha | console.error e continua com próxima imagem |

---

## 10. Instalação da Extensão

1. Baixar a pasta `chrome-extension-sfmc-proxy/`
2. Abrir `chrome://extensions` no Chrome
3. Ativar "Modo do desenvolvedor"
4. Clicar "Carregar sem compactação"
5. Selecionar a pasta da extensão
6. A extensão estará ativa automaticamente nos domínios configurados no manifest

As credenciais OAuth2 estão hardcoded no `background.js` (distribuição interna segura).
