

## Plano: Gerar arquivo .md com documentação técnica do módulo Jira Tasks

Vou criar um arquivo `docs/jira-tasks-technical.md` na raiz do projeto com toda a documentação técnica do módulo `/jira-tasks`, incluindo:

### Conteúdo do documento

1. **Arquitetura geral** - visão do fluxo frontend → edge functions → Jira Cloud API → banco de dados
2. **Rotas e páginas** - todas as 5 rotas (`/jira-tasks`, `/new`, `/list`, `/okrs`, `/admin/jira`)
3. **Tabelas do banco** - `jira_tasks`, `jira_task_subtasks`, `jira_okrs`, `jira_areas` com schemas
4. **Edge Functions** - `create-jira-task`, `delete-jira-task`, `create-jira-epic`, `jira-login` com payloads e lógica
5. **Jira API** - endpoints utilizados, autenticação Basic Auth, projeto `MAR`, issue types (`Esteira`, subtask id `10011`)
6. **Configurações e secrets** - `JIRA_API_TOKEN`, `JIRA_USER_EMAIL`, `JIRA_LOGIN_SECRET`
7. **Hooks** - todos os hooks de `useJiraTasks.ts` com queries e mutations
8. **Types** - interfaces TypeScript completas
9. **Trechos de código relevantes** - HTML→ADF converter, sprint label generator, briefing→task flow
10. **Componentes auxiliares** - `OperationProgressModal`

### Implementação

Criar um único arquivo `.md` com todas essas seções, pronto para copiar e colar para outra LLM.

