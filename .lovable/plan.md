
# Plano: Trocar Endpoint de Encurtamento de URL

## Objetivo

Substituir o endpoint `https://gnetbr.com/shortener` pelo novo endpoint `https://shortener.gerencianet.com.br` na extensão do Chrome.

## Arquivos a Modificar

### 1. `chrome-extension-sfmc-proxy/background.js`

**Linha 79** - Função `testEfiLinkConnection()`:
```javascript
// De:
const response = await fetch("https://gnetbr.com/shortener", {

// Para:
const response = await fetch("https://shortener.gerencianet.com.br", {
```

**Linha 85** - Corpo da requisição de teste:
```javascript
// De:
body: JSON.stringify({ url: "https://gnetbr.com/shortener" }),

// Para:
body: JSON.stringify({ url: "https://gerencianet.com.br" }),
```

**Linha 452** - Função `shortenUrl()`:
```javascript
// De:
const response = await fetch("https://gnetbr.com/shortener", {

// Para:
const response = await fetch("https://shortener.gerencianet.com.br", {
```

### 2. `chrome-extension-sfmc-proxy/manifest.json`

**Linha 14** - Adicionar permissão para o novo domínio:
```json
"host_permissions": [
  "https://*.exacttargetapis.com/*",
  "https://*.salesforce.com/*",
  "https://*.marketingcloudapis.com/*",
  "https://gnetbr.com/*",
  "https://shortener.gerencianet.com.br/*",
  "https://*.gerencianet.com.br/*"
]
```

### 3. `chrome-extension-sfmc-proxy/rules.json`

**Linha 14-15** - Atualizar regra de CORS bypass:
```json
{
  "header": "Referer",
  "operation": "set",
  "value": "https://gerencianet.com.br/"
}
```

**Linha 35** - Atualizar filtro de URL:
```json
"condition": {
  "urlFilter": "shortener.gerencianet.com.br",
  "resourceTypes": ["xmlhttprequest"]
}
```

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `background.js` | 3 substituições de URL |
| `manifest.json` | Adicionar host_permissions |
| `rules.json` | Atualizar Referer e urlFilter |

## Observação Importante

Após as alterações, o usuário precisará **recarregar a extensão** no Chrome (chrome://extensions → botão de reload) para que as novas permissões e regras entrem em vigor.
