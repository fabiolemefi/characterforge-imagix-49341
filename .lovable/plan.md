
# Plano: Adicionar Abas "Sites Offline" e "Sites Online" ao Efi Code

## Objetivo

Implementar no `/efi-code` a mesma funcionalidade de abas que existe em `/email-templates`, onde:
- **Sites Offline**: Sites salvos localmente no Supabase (funcionalidade atual)
- **Sites Online**: Cloud Pages do Marketing Cloud (via extensão SFMC Proxy)

## Análise Técnica

### Cloud Pages no Marketing Cloud

As Cloud Pages são armazenadas como assets no Content Builder com:
- **assetType.id = 205** (Web Page / webpage)
- Diferente dos emails que usam assetType.id entre 207-209

### Arquitetura Existente

O `/email-templates` já implementa esse padrão usando:
1. **Tabs** do Radix UI para alternar entre offline/online
2. **sendToExtension()** para comunicar com a extensão Chrome
3. **Estados separados** para cada aba (loading, pagination, search)
4. **Ações**: LIST_EMAILS, GET_EMAIL, DELETE_EMAIL adaptadas para Cloud Pages

### O que precisa ser implementado

| Componente | Descrição |
|------------|-----------|
| Nova action no background.js | `LIST_CLOUDPAGES` - query com assetType.id = 205 |
| Nova action no background.js | `GET_CLOUDPAGE` - buscar conteúdo de uma Cloud Page |
| Nova action no background.js | `DELETE_CLOUDPAGE` - deletar Cloud Page |
| Modificar EfiCode.tsx | Adicionar sistema de abas igual EmailTemplates |

## Arquivos a Modificar

### 1. `chrome-extension-sfmc-proxy/background.js`

Adicionar funções para Cloud Pages:

```javascript
// Listar Cloud Pages do SFMC (assetType.id = 205)
async function listCloudPagesFromSfmc(page = 1, pageSize = 25, searchQuery = "", categoryId = null) {
  const { accessToken, restInstanceUrl } = await getSfmcAccessToken();
  
  const url = `${restInstanceUrl}asset/v1/content/assets/query`;
  
  let query = {
    page: { page, pageSize },
    query: {
      property: "assetType.id",
      simpleOperator: "equal",
      value: 205 // Web Page = Cloud Page
    },
    sort: [{ property: "modifiedDate", direction: "DESC" }],
    fields: ["id", "name", "assetType", "modifiedDate", "status", "customerKey", "category"]
  };
  
  // Adiciona filtros de busca e categoria...
  // (similar ao listEmailsFromSfmc)
}

// GET e DELETE seguem o mesmo padrão das funções de email
```

No switch de ações, adicionar:

```javascript
case "LIST_CLOUDPAGES":
  const cloudPagesResult = await listCloudPagesFromSfmc(...);
  return { success: true, ...cloudPagesResult };

case "GET_CLOUDPAGE":
  const cloudPageData = await getEmailFromSfmc(message.payload?.assetId);
  return { success: true, ...cloudPageData };

case "DELETE_CLOUDPAGE":
  const deleteCloudPageResult = await deleteEmailFromSfmc(message.payload?.assetId);
  return deleteCloudPageResult;
```

### 2. `src/pages/EfiCode.tsx`

Refatorar para incluir:

```typescript
// Estados para abas
const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');

// Estados para Cloud Pages online
const [onlinePages, setOnlinePages] = useState<OnlineCloudPage[]>([]);
const [onlineLoading, setOnlineLoading] = useState(false);
const [onlinePage, setOnlinePage] = useState(1);
const [onlineTotalCount, setOnlineTotalCount] = useState(0);
const [extensionConnected, setExtensionConnected] = useState(false);
const [onlineSearchQuery, setOnlineSearchQuery] = useState('');

// Funções de comunicação com extensão (reutilizar de extensionProxy.ts)
import { sendToExtension, checkExtensionInstalled } from '@/lib/extensionProxy';

// Carregar Cloud Pages
const loadOnlinePages = async (page = 1, search = '') => {
  setOnlineLoading(true);
  try {
    const isConnected = await checkExtensionInstalled();
    setExtensionConnected(isConnected);
    if (!isConnected) return;
    
    const response = await sendToExtension('LIST_CLOUDPAGES', { 
      page, 
      pageSize: ITEMS_PER_PAGE,
      search 
    });
    
    if (response.success) {
      setOnlinePages(response.items || []);
      setOnlineTotalCount(response.count || 0);
      setOnlinePage(page);
    }
  } finally {
    setOnlineLoading(false);
  }
};
```

Estrutura visual:

```tsx
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'offline' | 'online')}>
  <TabsList>
    <TabsTrigger value="offline" className="flex items-center gap-2">
      <HardDrive className="h-4 w-4" />
      Sites Offline
    </TabsTrigger>
    <TabsTrigger value="online" className="flex items-center gap-2">
      <Cloud className="h-4 w-4" />
      Sites Online
      {extensionConnected && <span className="w-2 h-2 bg-green-500 rounded-full" />}
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="offline">
    {/* Conteúdo atual da tabela de sites */}
  </TabsContent>
  
  <TabsContent value="online">
    {/* Nova tabela de Cloud Pages do SFMC */}
  </TabsContent>
</Tabs>
```

### 3. `src/lib/extensionProxy.ts`

Adicionar tipos e funções específicas para Cloud Pages:

```typescript
export interface CloudPage {
  id: number;
  name: string;
  assetType?: { id: number; name: string };
  modifiedDate?: string;
  status?: { id: number; name: string };
  customerKey?: string;
  category?: { id: number; name: string };
}

export async function listCloudPages(page = 1, pageSize = 25, search = ''): Promise<{
  success: boolean;
  items?: CloudPage[];
  count?: number;
  error?: string;
}> {
  return sendToExtension('LIST_CLOUDPAGES', { page, pageSize, search });
}
```

## Interface Visual

A aba "Sites Online" terá:

| Coluna | Descrição |
|--------|-----------|
| Nome | Nome da Cloud Page |
| Tipo | assetType.displayName ("Web Page") |
| Pasta | category.name |
| Atualizado | modifiedDate formatado |
| Ações | Visualizar (abre URL), Excluir |

**Ações disponíveis para Cloud Pages online:**
- **Visualizar**: Abre a URL da Cloud Page (se publicada)
- **Editar**: Importa o HTML para o editor Efi Code (cria novo site offline)
- **Excluir**: Remove do Marketing Cloud (com confirmação)

## Fluxo de Importação

1. Usuário clica em "Editar" em uma Cloud Page online
2. Sistema busca o conteúdo completo via GET_CLOUDPAGE
3. Cria um novo site offline com o nome "Cópia de {nome original}"
4. Converte o HTML da Cloud Page para o formato do Craft.js
5. Abre o editor com o novo site

## Componentes a Importar

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HardDrive, Cloud, RefreshCw, Search, Loader } from 'lucide-react';
import { sendToExtension, checkExtensionInstalled } from '@/lib/extensionProxy';
```

## Resultado Esperado

1. Página `/efi-code` exibe duas abas: "Sites Offline" e "Sites Online"
2. "Sites Offline" funciona como hoje (lista do Supabase)
3. "Sites Online" lista Cloud Pages do Marketing Cloud via extensão
4. Indicador verde mostra quando extensão está conectada
5. Busca funciona em ambas as abas
6. Paginação independente para cada aba
7. Ações específicas para cada tipo de site
