# EFI SFMC Proxy - Extensão Chrome

Extensão Chrome que atua como proxy para upload de assets no Salesforce Marketing Cloud via EFI Builder.

## Por que usar esta extensão?

O Marketing Cloud pode bloquear requisições de IPs não autorizados (como servidores de backend). Esta extensão resolve esse problema fazendo as requisições diretamente do seu navegador, que já possui acesso autorizado.

## Instalação

### Modo Desenvolvedor (Recomendado para testes)

1. Abra o Chrome e acesse `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** no canto superior direito
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `chrome-extension-sfmc-proxy`
5. A extensão aparecerá na barra de extensões

### Configuração

1. Clique no ícone da extensão na barra do Chrome
2. Preencha as credenciais do Marketing Cloud:
   - **Client ID**: ID do seu App no SFMC
   - **Client Secret**: Secret do seu App no SFMC
   - **Auth Base URI**: Ex: `https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com`
   - **Subdomain**: Seu subdomain do SFMC
3. Clique em **Salvar**
4. Clique em **Testar Conexão** para verificar

## Como funciona

```
┌─────────────────────────────────────────────────────────────────┐
│  EFI Builder (Página Web)                                       │
│  └── window.postMessage() ────────────────────────────┐         │
│                                                        ▼         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Content Script (content.js)                                 ││
│  │  └── chrome.runtime.sendMessage() ──────────────┐            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                      ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Background Script (background.js)                           ││
│  │  ├── getSfmcAccessToken() → OAuth2                           ││
│  │  └── uploadAssetToSfmc() → REST API                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                      │           │
└──────────────────────────────────────────────────────│───────────┘
                                                       ▼
                                         ┌─────────────────────────┐
                                         │  Marketing Cloud API    │
                                         │  (Usando IP do usuário) │
                                         └─────────────────────────┘
```

## Credenciais do Marketing Cloud

Para obter as credenciais:

1. Acesse o **Setup** do Marketing Cloud
2. Vá em **Apps > Installed Packages**
3. Crie ou selecione um package
4. Copie o **Client ID** e **Client Secret**
5. Anote o **Authentication Base URI** (ex: `https://mc1234.auth.marketingcloudapis.com`)

### Permissões necessárias no Package

- `documents_and_images: read, write`
- `saved_content: read, write`

## Segurança

- As credenciais são armazenadas localmente no Chrome (`chrome.storage.local`)
- Nenhum dado é enviado para servidores externos além do Marketing Cloud
- Os tokens de acesso são cacheados e renovados automaticamente

## Troubleshooting

### "Extensão não detectada"
- Verifique se a extensão está ativa em `chrome://extensions/`
- Recarregue a página do EFI Builder

### "Credenciais não configuradas"
- Abra o popup da extensão e configure as credenciais
- Certifique-se de clicar em **Salvar**

### "Erro de autenticação"
- Verifique se o Client ID e Secret estão corretos
- Confirme que o Auth Base URI está no formato correto
- Verifique as permissões do Package no SFMC

### "Erro no upload"
- Verifique se o Package tem permissão para criar assets
- Confirme que o formato do asset está correto (base64 válido)
