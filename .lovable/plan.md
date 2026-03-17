

# Documentação: Como Enviar Email para o Marketing Cloud (SFMC)

Vou criar um arquivo `docs/sfmc-email-export.md` com instruções completas para outra LLM reproduzir o fluxo de exportação de emails para o Salesforce Marketing Cloud.

## Conteúdo do documento

O documento cobrirá a arquitetura completa em 4 camadas:

### 1. Arquitetura Geral
- **Problema**: O IP do servidor é bloqueado pelo SFMC, impedindo chamadas diretas via Edge Functions
- **Solução**: Chrome Extension atua como proxy OAuth2, usando a sessão autenticada do navegador do usuário
- **Fluxo**: Frontend → `window.postMessage` → Content Script → `chrome.runtime.sendMessage` → Background (Service Worker) → SFMC REST API

### 2. Chrome Extension (3 arquivos)
- **manifest.json**: Permissões, content scripts, host_permissions para `*.marketingcloudapis.com`
- **content.js**: Ponte bidirecional via `window.postMessage` com `requestId` matching e detecção de contexto invalidado
- **background.js**: OAuth2 (`client_credentials` grant), token cache (TTL 30min - 5min segurança), e todas as ações SFMC:
  - `UPLOAD_ASSET` → POST `/asset/v1/content/assets`
  - `LIST_EMAILS` → POST `/asset/v1/content/assets/query` (assetType 207-209)
  - `GET_EMAIL` → GET `/asset/v1/content/assets/{id}`
  - `DELETE_EMAIL` → DELETE `/asset/v1/content/assets/{id}`
  - `UPDATE_ASSET` → PATCH `/asset/v1/content/assets/{id}`
  - `LIST_CATEGORIES`, `MOVE_ASSET`

### 3. Fluxo de Export (handleExportToMC)
- Extrai imagens do HTML (`<img src>`)
- Converte cada imagem para base64 via `fetch` + `FileReader`
- Gera `customerKey` curto (máx 36 chars): `img_[base36timestamp]_[suffix]`
- Upload de cada imagem como asset (assetType 22=jpeg, 28=png, 23=gif) na categoria 93941
- Substitui URLs das imagens para `image.comunicacao.sejaefi.com.br/...`
- Upload do HTML final como `htmlemail` (assetType 208) na categoria 93810, com views (html, subjectline, preheader)

### 4. Payloads Exatos
- Payload de imagem e payload de HTML com exemplos concretos
- Fluxo de atualização (UPDATE_ASSET via PATCH) para emails existentes

### 5. Frontend Communication Pattern
- `sendToExtension()` com requestId, timeout 30s, e event listener pattern
- `checkExtension()` para verificar disponibilidade

## Implementação

Será um único arquivo: `docs/sfmc-email-export.md`

