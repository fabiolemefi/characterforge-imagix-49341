// EFI SFMC Proxy - Background Service Worker

// Cache do token para evitar múltiplas autenticações
let tokenCache = {
  accessToken: null,
  restInstanceUrl: null,
  expiresAt: null
};

// Obtém as credenciais salvas
async function getCredentials() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sfmc_client_id', 'sfmc_client_secret', 'sfmc_auth_uri', 'sfmc_subdomain'], (result) => {
      resolve({
        clientId: result.sfmc_client_id || '',
        clientSecret: result.sfmc_client_secret || '',
        authUri: result.sfmc_auth_uri || '',
        subdomain: result.sfmc_subdomain || ''
      });
    });
  });
}

// Autenticação OAuth2 no SFMC
async function getSfmcAccessToken() {
  // Verifica se o token em cache ainda é válido
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    console.log('[SFMC Proxy] Usando token em cache');
    return {
      accessToken: tokenCache.accessToken,
      restInstanceUrl: tokenCache.restInstanceUrl
    };
  }

  const credentials = await getCredentials();
  
  if (!credentials.clientId || !credentials.clientSecret || !credentials.authUri) {
    throw new Error('Credenciais SFMC não configuradas. Abra a extensão e configure.');
  }

  console.log('[SFMC Proxy] Autenticando no SFMC...');
  
  const authUrl = `${credentials.authUri}/v2/token`;
  
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SFMC Proxy] Erro de autenticação:', errorText);
    throw new Error(`Falha na autenticação SFMC: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Cacheia o token (expira 5 minutos antes do tempo real para segurança)
  tokenCache = {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url,
    expiresAt: Date.now() + ((data.expires_in - 300) * 1000)
  };

  console.log('[SFMC Proxy] Autenticação bem-sucedida');
  
  return {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url
  };
}

// Upload de asset para o SFMC
async function uploadAssetToSfmc(assetData) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();
  
  const url = `${restInstanceUrl}asset/v1/content/assets`;
  
  console.log('[SFMC Proxy] Enviando asset:', assetData.name);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assetData)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('[SFMC Proxy] Erro no upload:', responseData);
    throw new Error(responseData.message || `Upload falhou: ${response.status}`);
  }

  console.log('[SFMC Proxy] Asset criado:', responseData.id);
  
  return {
    success: true,
    assetId: responseData.id,
    assetUrl: responseData.fileProperties?.publishedURL || null,
    data: responseData
  };
}

// Listar emails do SFMC
async function listEmailsFromSfmc(page = 1, pageSize = 25, searchQuery = '') {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();
  
  const url = `${restInstanceUrl}asset/v1/content/assets/query`;
  
  console.log('[SFMC Proxy] Listando emails, página:', page);
  
  // Query base para tipos de email (207=Template-based, 208=HTML, 209=Text-only)
  let query = {
    page: { page, pageSize },
    query: {
      leftOperand: {
        property: "assetType.id",
        simpleOperator: "greaterThanOrEqual",
        value: 207
      },
      logicalOperator: "AND",
      rightOperand: {
        property: "assetType.id",
        simpleOperator: "lessThanOrEqual",
        value: 209
      }
    },
    sort: [{ property: "modifiedDate", direction: "DESC" }],
    fields: ["id", "name", "assetType", "modifiedDate", "status", "customerKey", "category"]
  };

  // Adiciona filtro de nome se houver busca
  if (searchQuery && searchQuery.trim()) {
    query.query = {
      leftOperand: query.query,
      logicalOperator: "AND",
      rightOperand: {
        property: "name",
        simpleOperator: "like",
        value: `%${searchQuery}%`
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[SFMC Proxy] Erro ao listar emails:', errorData);
    throw new Error(errorData.message || `Erro ao listar emails: ${response.status}`);
  }

  const data = await response.json();
  console.log('[SFMC Proxy] Emails encontrados:', data.count);
  
  return {
    items: data.items || [],
    count: data.count || 0,
    page: data.page || page,
    pageSize: data.pageSize || pageSize
  };
}

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SFMC_PROXY_REQUEST') {
    return false;
  }

  console.log('[SFMC Proxy] Requisição recebida:', message.action);

  const handleRequest = async () => {
    try {
      switch (message.action) {
        case 'CHECK_EXTENSION':
          const credentials = await getCredentials();
          const isConfigured = !!(credentials.clientId && credentials.clientSecret && credentials.authUri);
          return { success: true, configured: isConfigured };

        case 'TEST_CONNECTION':
          await getSfmcAccessToken();
          return { success: true, message: 'Conexão com SFMC estabelecida!' };

        case 'UPLOAD_ASSET':
          const result = await uploadAssetToSfmc(message.payload);
          return result;

        case 'LIST_EMAILS':
          const emailsResult = await listEmailsFromSfmc(
            message.payload?.page || 1,
            message.payload?.pageSize || 25,
            message.payload?.search || ''
          );
          return { success: true, ...emailsResult };

        default:
          throw new Error(`Ação desconhecida: ${message.action}`);
      }
    } catch (error) {
      console.error('[SFMC Proxy] Erro:', error);
      return { success: false, error: error.message };
    }
  };

  handleRequest().then(sendResponse);
  
  // Retorna true para indicar que a resposta será assíncrona
  return true;
});

// Limpa o cache ao atualizar credenciais
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.sfmc_client_id || changes.sfmc_client_secret || changes.sfmc_auth_uri)) {
    console.log('[SFMC Proxy] Credenciais alteradas, limpando cache de token');
    tokenCache = { accessToken: null, restInstanceUrl: null, expiresAt: null };
  }
});

console.log('[SFMC Proxy] Service Worker iniciado');
