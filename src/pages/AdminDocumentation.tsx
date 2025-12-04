import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const AdminDocumentation = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-4 mb-8">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Documentação Interna</h1>
          </div>

          <div className="max-w-4xl">
            <p className="text-muted-foreground mb-6">
              Esta documentação serve como referência para a criação e manutenção de plugins no sistema.
            </p>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="criando-plugin">
                <AccordionTrigger className="text-lg font-semibold">
                  Criando um novo plugin
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  Para criar um novo plugin no sistema é necessário seguir uma série de passos que envolvem banco de dados, rotas, sidebar e componentes. Primeiro, o plugin deve ser cadastrado na tabela plugins no Supabase. Esta tabela possui os campos id (uuid), name (text, obrigatório), description (text), image_url (text), is_active (boolean, default true), is_new (boolean, default false), in_development (boolean, default false), general_prompt (text), created_at e updated_at. O plugin só aparece no sidebar se is_active for true e in_development for false, conforme filtro no hook usePlugins localizado em src/hooks/usePlugins.ts que faz a query com .eq('is_active', true).eq('in_development', false). Para adicionar um novo plugin via admin, acesse /admin/plugins onde existe um formulário completo para criar, editar e excluir plugins com upload de imagem para o bucket plugin-images no storage do Supabase. Após criar o plugin no banco, é necessário criar a página do plugin em src/pages seguindo o padrão NomeDoPlugin.tsx. A rota deve ser adicionada em src/App.tsx seguindo o padrão das rotas existentes, por exemplo Route path="/nome-do-plugin" element com ProtectedRoute, AppLayout e NomeDoPlugin. Se o plugin tiver um nome específico como Efimail ou Efimagem, é necessário atualizar a função getPluginPath em src/components/Sidebar.tsx para mapear o nome do plugin para a rota correta, caso contrário o sistema usará a rota genérica /plugin/:id que renderiza PluginDetails.tsx. O componente PluginDetails.tsx em src/pages/PluginDetails.tsx verifica o nome do plugin e faz redirect para páginas específicas como Efimail, Efimagem ou Email Builder, então se seu plugin precisa de uma página dedicada, adicione a lógica de redirect neste arquivo. Para plugins que precisam de configurações administrativas específicas, adicione os controles em src/pages/AdminPlugins.tsx onde já existe toda a infraestrutura de CRUD com dialog, tabela e formulários. Se o plugin precisa de personagens ou elementos filhos, use a tabela plugin_characters que tem foreign key para plugins e a tabela character_images para imagens dos personagens. O storage bucket plugin-images é público e aceita arquivos de imagem para os plugins. As RLS policies da tabela plugins permitem que admins gerenciem (ALL) e qualquer usuário visualize plugins ativos (SELECT com is_active = true). Para hooks de dados, crie em src/hooks seguindo o padrão useNomeDoPlugin.ts usando React Query com useQuery para cache automático. O componente de página deve usar o layout padrão com SidebarProvider se for área admin ou AppLayout se for área do usuário. Lembre-se de importar o componente de página no App.tsx e adicionar todas as rotas necessárias antes do catch-all Route path="*".
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="estrutura-arquivos">
                <AccordionTrigger className="text-lg font-semibold">
                  Estrutura de arquivos do projeto
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  O projeto segue uma estrutura organizada em src com as seguintes pastas principais. A pasta pages contém todas as páginas do sistema, tanto de usuário quanto de admin, com prefixo Admin para páginas administrativas. A pasta components contém componentes reutilizáveis organizados por contexto, como components/ui para componentes shadcn, components/brandguide para componentes do guia de marca, components/tests para componentes de testes. A pasta hooks contém todos os hooks customizados, principalmente hooks de dados usando React Query como usePlugins, useBrandGuide, useEmailTemplates. A pasta contexts contém contextos React como AuthContext para autenticação. A pasta integrations/supabase contém o client.ts (não editar) e types.ts (gerado automaticamente, não editar). A pasta lib contém utilitários como utils.ts com a função cn para classes condicionais. A pasta supabase/functions contém as edge functions do backend. O arquivo App.tsx é o ponto central de rotas, QueryClient e providers. O arquivo index.css contém as variáveis CSS do design system e o tailwind.config.ts contém a configuração do Tailwind com as cores e animações do projeto.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tabelas-supabase">
                <AccordionTrigger className="text-lg font-semibold">
                  Tabelas do Supabase relacionadas a plugins
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  A tabela plugins é a principal tabela para armazenar informações dos plugins com campos id, name, description, image_url, is_active, is_new, in_development, general_prompt, created_at, updated_at. A tabela plugin_characters armazena personagens vinculados a plugins com campos id, plugin_id (foreign key), name, general_prompt, position, is_active, created_at, updated_at. A tabela character_images armazena imagens dos personagens com campos id, character_id (foreign key), image_url, position, is_cover, created_at. Para plugins que envolvem email como Efimail, existem as tabelas email_blocks para blocos de email, email_templates para templates salvos e email_template_blocks para relacionar blocos com templates. O bucket de storage plugin-images é usado para armazenar imagens dos plugins e é público. Todas as tabelas possuem RLS policies configuradas onde admins podem gerenciar tudo e usuários podem visualizar itens ativos.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="padroes-codigo">
                <AccordionTrigger className="text-lg font-semibold">
                  Padrões de código e boas práticas
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  Sempre use TypeScript com tipagem adequada. Para queries ao Supabase, use React Query através de hooks customizados em src/hooks seguindo o padrão useNomeDoRecurso.ts com useQuery para leitura e useMutation para escrita. O staleTime padrão é 5 minutos e gcTime é 10 minutos conforme configurado no queryClient em App.tsx. Para componentes de UI, use os componentes do shadcn/ui em src/components/ui e estilize com Tailwind CSS usando as variáveis semânticas definidas em index.css como text-foreground, bg-background, text-muted-foreground, bg-primary, text-primary-foreground. Nunca use cores hardcoded como text-white ou bg-black, sempre use tokens semânticos. Para formulários, use react-hook-form com zod para validação. Para toasts e notificações, use o componente toast de sonner. Para ícones, use lucide-react. Para navegação, use react-router-dom com useNavigate e NavLink. O layout de páginas admin usa SidebarProvider com AdminSidebar, enquanto páginas de usuário usam AppLayout que inclui o Sidebar principal. Sempre adicione scroll to top ao navegar entre páginas com window.scrollTo com top 0 e behavior instant.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="admin-plugins">
                <AccordionTrigger className="text-lg font-semibold">
                  Administração de plugins em /admin/plugins
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  A página AdminPlugins.tsx em src/pages/AdminPlugins.tsx é responsável pelo CRUD completo de plugins. Ela verifica se o usuário é admin através do profile.is_admin e redireciona para home se não for. A página exibe uma tabela com todos os plugins mostrando imagem, nome, descrição e badges para is_new e in_development. Cada linha tem botões para editar, gerenciar blocos de email (se aplicável), gerenciar personagens e excluir. O dialog de criação/edição possui campos para nome, descrição, upload de imagem, checkbox para is_new e in_development. O upload de imagem usa o bucket plugin-images com path plugins/timestamp-filename. A função handleSubmit faz upsert no banco e a função handleDelete remove o plugin. O componente CharactersModal é usado para gerenciar personagens do plugin selecionado. Para adicionar novas funcionalidades específicas de um plugin na área admin, adicione botões na coluna de ações da tabela e crie os modais ou páginas necessárias.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sidebar-navegacao">
                <AccordionTrigger className="text-lg font-semibold">
                  Configuração do Sidebar e navegação
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  O Sidebar principal em src/components/Sidebar.tsx exibe os plugins ativos para os usuários. Ele usa o hook usePlugins para carregar os plugins e a função getPluginPath para determinar a rota de cada plugin baseado no nome. Se o nome for Efimail retorna /efimail, se for Efimagem retorna /efimagem, se for Email Builder retorna /email-templates, caso contrário retorna /plugin/id. Para adicionar um novo plugin com rota dedicada, adicione a condição em getPluginPath e atualize também o useEffect que controla expandedPlugins para incluir a nova rota. O AdminSidebar em src/components/AdminSidebar.tsx é usado nas páginas administrativas e possui um array menuItems com os links do menu admin. Para adicionar um novo item no menu admin, adicione um objeto com title, url e icon no array menuItems. O Sidebar usa estados expandedPlugins, expandedBrandGuide, expandedTests para controlar quais menus estão expandidos e auto-expande baseado na rota atual através do useEffect.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="checklist-novo-plugin">
                <AccordionTrigger className="text-lg font-semibold">
                  Checklist para criar novo plugin
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  1. Cadastrar o plugin na tabela plugins via /admin/plugins ou diretamente no banco com name, description, image_url, is_active true, in_development false. 2. Criar o arquivo da página em src/pages/NomeDoPlugin.tsx com o componente e layout adequado. 3. Adicionar a rota em src/App.tsx no formato Route path="/nome-do-plugin" element com ProtectedRoute, AppLayout e NomeDoPlugin. 4. Atualizar a função getPluginPath em src/components/Sidebar.tsx para mapear o nome do plugin para a rota se for diferente do padrão /plugin/id. 5. Atualizar o useEffect em Sidebar.tsx para auto-expandir o menu Plugins quando a rota do novo plugin estiver ativa. 6. Se necessário, atualizar PluginDetails.tsx para fazer redirect do /plugin/id para a rota dedicada. 7. Se o plugin precisar de tabelas próprias, criar as migrations com as tabelas e RLS policies adequadas. 8. Se precisar de storage, criar o bucket com as policies necessárias. 9. Criar hooks em src/hooks para gerenciar dados do plugin usando React Query. 10. Se precisar de área administrativa específica, adicionar os controles em AdminPlugins.tsx ou criar uma página admin dedicada.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDocumentation;
