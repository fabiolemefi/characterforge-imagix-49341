// EFI SFMC Proxy - Background Service Worker

// Credenciais SFMC hardcoded (distribuição segura interna)
const SFMC_CREDENTIALS = {
  clientId: "x1rkxikmm8pcgbfbnayohoh7",
  clientSecret: "Lo7SP7LUKCLl9fUtk694aq8d",
  authUri: "https://mcn3dvqncqsps20bqzd6yb8r97ty.auth.marketingcloudapis.com",
  subdomain: "mcn3dvqncqsps20bqzd6yb8r97ty",
};

// Cache do token para evitar múltiplas autenticações
let tokenCache = {
  accessToken: null,
  restInstanceUrl: null,
  expiresAt: null,
};

// Obtém as credenciais (agora hardcoded)
async function getCredentials() {
  return SFMC_CREDENTIALS;
}

// Autenticação OAuth2 no SFMC
async function getSfmcAccessToken() {
  // Verifica se o token em cache ainda é válido
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    console.log("[SFMC Proxy] Usando token em cache");
    return {
      accessToken: tokenCache.accessToken,
      restInstanceUrl: tokenCache.restInstanceUrl,
    };
  }

  const credentials = await getCredentials();

  console.log("[SFMC Proxy] Autenticando no SFMC...");

  const authUrl = `${credentials.authUri}/v2/token`;

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[SFMC Proxy] Erro de autenticação:", errorText);
    throw new Error(`Falha na autenticação SFMC: ${response.status}`);
  }

  const data = await response.json();

  // Cacheia o token (expira 5 minutos antes do tempo real para segurança)
  tokenCache = {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  console.log("[SFMC Proxy] Autenticação bem-sucedida");

  return {
    accessToken: data.access_token,
    restInstanceUrl: data.rest_instance_url,
  };
}

// Testar conexão com Efí Link API (encurtador)
async function testEfiLinkConnection() {
  console.log("[Efí Link] Testando conexão...");

  const response = await fetch("https://gnetbr.com/shortener", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ url: "https://gnetbr.com/shortener" }),
  });

  if (!response.ok) {
    throw new Error("Efí Link API offline");
  }

  console.log("[Efí Link] API online");
  return { success: true };
}

// Upload de asset para o SFMC
async function uploadAssetToSfmc(assetData) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets`;

  console.log("[SFMC Proxy] Enviando asset:", assetData.name);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assetData),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error("[SFMC Proxy] Erro no upload:", responseData);
    throw new Error(responseData.message || `Upload falhou: ${response.status}`);
  }

  console.log("[SFMC Proxy] Asset criado:", responseData.id);

  return {
    success: true,
    assetId: responseData.id,
    assetUrl: responseData.fileProperties?.publishedURL || null,
    data: responseData,
  };
}

// Listar emails do SFMC
async function listEmailsFromSfmc(page = 1, pageSize = 25, searchQuery = "", categoryId = null) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets/query`;

  console.log("[SFMC Proxy] Listando emails, página:", page, "categoria:", categoryId);

  // Query base para tipos de email (207=Template-based, 208=HTML, 209=Text-only)
  let query = {
    page: { page, pageSize },
    query: {
      leftOperand: {
        property: "assetType.id",
        simpleOperator: "greaterThanOrEqual",
        value: 207,
      },
      logicalOperator: "AND",
      rightOperand: {
        property: "assetType.id",
        simpleOperator: "lessThanOrEqual",
        value: 209,
      },
    },
    sort: [{ property: "modifiedDate", direction: "DESC" }],
    fields: ["id", "name", "assetType", "modifiedDate", "status", "customerKey", "category"],
  };

  // Adiciona filtro de nome se houver busca
  if (searchQuery && searchQuery.trim()) {
    query.query = {
      leftOperand: query.query,
      logicalOperator: "AND",
      rightOperand: {
        property: "name",
        simpleOperator: "like",
        value: `%${searchQuery}%`,
      },
    };
  }

  // Adiciona filtro de categoria/pasta
  if (categoryId) {
    query.query = {
      leftOperand: query.query,
      logicalOperator: "AND",
      rightOperand: {
        property: "category.id",
        simpleOperator: "equal",
        value: categoryId,
      },
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("[SFMC Proxy] Erro ao listar emails:", errorData);
    throw new Error(errorData.message || `Erro ao listar emails: ${response.status}`);
  }

  const data = await response.json();
  console.log("[SFMC Proxy] Emails encontrados:", data.count);

  return {
    items: data.items || [],
    count: data.count || 0,
    page: data.page || page,
    pageSize: data.pageSize || pageSize,
  };
}

// Listar Cloud Pages do SFMC (assetType.id = 205)
async function listCloudPagesFromSfmc(page = 1, pageSize = 25, searchQuery = "", categoryId = null) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets/query`;

  console.log("[SFMC Proxy] Listando Cloud Pages, página:", page, "categoria:", categoryId);

  // Query para Cloud Pages (assetType.id = 205)
  let query = {
    page: { page, pageSize },
    query: {
      property: "assetType.id",
      simpleOperator: "equal",
      value: 205,
    },
    sort: [{ property: "modifiedDate", direction: "DESC" }],
    fields: ["id", "name", "assetType", "modifiedDate", "status", "customerKey", "category"],
  };

  // Adiciona filtro de nome se houver busca
  if (searchQuery && searchQuery.trim()) {
    query.query = {
      leftOperand: query.query,
      logicalOperator: "AND",
      rightOperand: {
        property: "name",
        simpleOperator: "like",
        value: `%${searchQuery}%`,
      },
    };
  }

  // Adiciona filtro de categoria/pasta
  if (categoryId) {
    query.query = {
      leftOperand: query.query,
      logicalOperator: "AND",
      rightOperand: {
        property: "category.id",
        simpleOperator: "equal",
        value: categoryId,
      },
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("[SFMC Proxy] Erro ao listar Cloud Pages:", errorData);
    throw new Error(errorData.message || `Erro ao listar Cloud Pages: ${response.status}`);
  }

  const data = await response.json();
  console.log("[SFMC Proxy] Cloud Pages encontradas:", data.count);

  return {
    items: data.items || [],
    count: data.count || 0,
    page: data.page || page,
    pageSize: data.pageSize || pageSize,
  };
}

// Buscar email específico do SFMC por ID
async function getEmailFromSfmc(assetId) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets/${assetId}`;

  console.log("[SFMC Proxy] Buscando email:", assetId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("[SFMC Proxy] Erro ao buscar email:", errorData);
    throw new Error(errorData.message || `Erro ao buscar email: ${response.status}`);
  }

  const data = await response.json();
  console.log("[SFMC Proxy] Email carregado:", data.name);

  return {
    id: data.id,
    name: data.name,
    content: data.content,
    views: data.views,
    assetType: data.assetType,
    status: data.status,
    category: data.category,
  };
}

// Deletar email/asset do SFMC
async function deleteEmailFromSfmc(assetId) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets/${assetId}`;

  console.log("[SFMC Proxy] Deletando email:", assetId);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  // SFMC retorna 200 ou 204 em caso de sucesso
  if (!response.ok) {
    let errorMessage = `Erro ao deletar email: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Resposta pode estar vazia
    }
    console.error("[SFMC Proxy] Erro ao deletar:", errorMessage);
    throw new Error(errorMessage);
  }

  console.log("[SFMC Proxy] Email deletado com sucesso");

  return { success: true };
}

// Listar pastas/categorias do SFMC
async function listCategoriesFromSfmc() {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/categories`;

  console.log("[SFMC Proxy] Listando categorias/pastas");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("[SFMC Proxy] Erro ao listar categorias:", errorData);
    throw new Error(errorData.message || `Erro ao listar categorias: ${response.status}`);
  }

  const data = await response.json();
  console.log("[SFMC Proxy] Categorias encontradas:", data.count);

  return {
    items: data.items || [],
    count: data.count || 0,
  };
}

// Mover asset para outra pasta/categoria
async function moveAssetToCategory(assetId, categoryId) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets/${assetId}`;

  console.log("[SFMC Proxy] Movendo asset", assetId, "para categoria", categoryId);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ category: { id: categoryId } }),
  });

  if (!response.ok) {
    let errorMessage = `Erro ao mover asset: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {}
    console.error("[SFMC Proxy] Erro ao mover:", errorMessage);
    throw new Error(errorMessage);
  }

  console.log("[SFMC Proxy] Asset movido com sucesso");

  return { success: true };
}

// Atualizar asset existente no SFMC
async function updateAssetInSfmc(assetId, assetData) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();

  const url = `${restInstanceUrl}asset/v1/content/assets/${assetId}`;

  console.log("[SFMC Proxy] Atualizando asset:", assetId, assetData.name || "");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assetData),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error("[SFMC Proxy] Erro na atualização:", responseData);
    throw new Error(responseData.message || `Atualização falhou: ${response.status}`);
  }

  console.log("[SFMC Proxy] Asset atualizado:", responseData.id);

  return {
    success: true,
    assetId: responseData.id,
    data: responseData,
  };
}

// Encurtar URL via gnetbr.com
async function shortenUrl(url) {
  console.log("[Efí Link] Encurtando URL:", url);

  const response = await fetch("https://gnetbr.com/shortener", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Efí Link] Erro ao encurtar:", errorText);
    throw new Error(`Erro ao encurtar URL: ${response.status}`);
  }

  const data = await response.json();
  console.log("[Efí Link] URL encurtada:", data.shorted_url);

  return {
    success: true,
    id: data.id,
    original_url: data.original_url,
    shorted: data.shorted,
    shorted_url: data.shorted_url,
  };
}

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "SFMC_PROXY_REQUEST") {
    return false;
  }

  console.log("[SFMC Proxy] Requisição recebida:", message.action);

  const handleRequest = async () => {
    try {
      switch (message.action) {
        case "CHECK_EXTENSION":
          return { success: true, configured: true };

        case "TEST_CONNECTION":
          // Testa ambas as conexões
          let sfmcOk = false;
          let efilinkOk = false;
          let sfmcError = null;
          let efilinkError = null;

          try {
            await getSfmcAccessToken();
            sfmcOk = true;
          } catch (e) {
            sfmcError = e.message;
          }

          try {
            await testEfiLinkConnection();
            efilinkOk = true;
          } catch (e) {
            efilinkError = e.message;
          }

          return {
            success: sfmcOk && efilinkOk,
            sfmc: sfmcOk,
            efilink: efilinkOk,
            sfmcError,
            efilinkError,
            message: sfmcOk && efilinkOk ? "Todas as conexões OK!" : "Falha em uma ou mais conexões",
          };

        case "TEST_EFILINK":
          await testEfiLinkConnection();
          return { success: true, message: "Efí Link API online" };

        case "UPLOAD_ASSET":
          const result = await uploadAssetToSfmc(message.payload);
          return result;

        case "LIST_EMAILS":
          const emailsResult = await listEmailsFromSfmc(
            message.payload?.page || 1,
            message.payload?.pageSize || 25,
            message.payload?.search || "",
            message.payload?.categoryId || null,
          );
          return { success: true, ...emailsResult };

        case "GET_EMAIL":
          const emailData = await getEmailFromSfmc(message.payload?.assetId);
          return { success: true, ...emailData };

        case "DELETE_EMAIL":
          const deleteResult = await deleteEmailFromSfmc(message.payload?.assetId);
          return deleteResult;

        case "LIST_CLOUDPAGES":
          const cloudPagesResult = await listCloudPagesFromSfmc(
            message.payload?.page || 1,
            message.payload?.pageSize || 25,
            message.payload?.search || "",
            message.payload?.categoryId || null,
          );
          return { success: true, ...cloudPagesResult };

        case "GET_CLOUDPAGE":
          const cloudPageData = await getEmailFromSfmc(message.payload?.assetId);
          return { success: true, ...cloudPageData };

        case "DELETE_CLOUDPAGE":
          const deleteCloudPageResult = await deleteEmailFromSfmc(message.payload?.assetId);
          return deleteCloudPageResult;

        case "LIST_CATEGORIES":
          const categoriesResult = await listCategoriesFromSfmc();
          return { success: true, ...categoriesResult };

        case "MOVE_ASSET":
          const moveResult = await moveAssetToCategory(message.payload?.assetId, message.payload?.categoryId);
          return moveResult;

        case "UPDATE_ASSET":
          const updateResult = await updateAssetInSfmc(message.payload?.assetId, message.payload?.assetData);
          return updateResult;

        case "SHORTEN_URL":
          const shortenResult = await shortenUrl(message.payload?.url);
          return shortenResult;

        default:
          throw new Error(`Ação desconhecida: ${message.action}`);
      }
    } catch (error) {
      console.error("[SFMC Proxy] Erro:", error);
      return { success: false, error: error.message };
    }
  };

  handleRequest().then(sendResponse);

  // Retorna true para indicar que a resposta será assíncrona
  return true;
});

console.log("[SFMC Proxy] Service Worker iniciado");
