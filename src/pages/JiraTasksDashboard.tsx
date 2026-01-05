import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  ListTodo, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { useJiraTasks, useJiraTasksMetrics } from "@/hooks/useJiraTasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function JiraTasksDashboard() {
  const navigate = useNavigate();
  const { data: tasks, isLoading: tasksLoading } = useJiraTasks();
  const { data: metrics, isLoading: metricsLoading } = useJiraTasksMetrics();

  const recentTasks = tasks?.slice(0, 5) || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Jira Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie tarefas no Jira de forma automatizada
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/jira-tasks/okrs")}>
            <Target className="h-4 w-4 mr-2" />
            Gerenciar OKRs
          </Button>
          <Button onClick={() => navigate("/jira-tasks/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criadas com Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{metrics?.created || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.thisWeek || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.thisMonth || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/jira-tasks/new")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Criar Nova Tarefa
            </CardTitle>
            <CardDescription>
              Crie uma tarefa com subtarefas automáticas
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/jira-tasks/okrs")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Gerenciar OKRs
            </CardTitle>
            <CardDescription>
              Cadastre e vincule seus OKRs/Épicos
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/jira-tasks/list")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListTodo className="h-5 w-5 text-primary" />
              Ver Histórico
            </CardTitle>
            <CardDescription>
              Veja todas as tarefas criadas
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tarefas Recentes</CardTitle>
            <CardDescription>Últimas tarefas criadas no Jira</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/jira-tasks/list")}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma tarefa criada ainda</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => navigate("/jira-tasks/new")}
              >
                Criar primeira tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{task.title}</span>
                      {task.jira_task_key && (
                        <Badge variant="outline" className="shrink-0">
                          {task.jira_task_key}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(task.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </span>
                      {task.sprint_label && (
                        <Badge variant="secondary" className="text-xs">
                          {task.sprint_label}
                        </Badge>
                      )}
                      {task.areas.map((area) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {task.status === "created" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : task.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : null}
                    {task.jira_task_key && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://sejaefi.atlassian.net/browse/${task.jira_task_key}`,
                            "_blank"
                          );
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
