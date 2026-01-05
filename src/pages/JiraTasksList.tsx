import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  ListTodo,
  Eye
} from "lucide-react";
import { useJiraTasks, useJiraTaskWithSubtasks } from "@/hooks/useJiraTasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { JiraTask } from "@/types/jiraTask";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-500" },
  created: { label: "Criado", icon: CheckCircle2, color: "text-green-500" },
  failed: { label: "Falhou", icon: XCircle, color: "text-destructive" },
};

export default function JiraTasksList() {
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useJiraTasks();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: taskDetails, isLoading: detailsLoading } = useJiraTaskWithSubtasks(
    selectedTaskId || ""
  );

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.jira_task_key?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const StatusIcon = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={`h-5 w-5 ${config.color}`} />;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jira-tasks")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Histórico de Tarefas</h1>
          <p className="text-muted-foreground">
            Veja todas as tarefas criadas no Jira
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou chave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="created">Criados</SelectItem>
                <SelectItem value="failed">Com Falha</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredTasks?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "Tente ajustar os filtros"
                : "Crie sua primeira tarefa"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks?.map((task) => (
            <Card 
              key={task.id} 
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setSelectedTaskId(task.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon status={task.status} />
                      <span className="font-medium truncate">{task.title}</span>
                      {task.jira_task_key && (
                        <Badge variant="outline">{task.jira_task_key}</Badge>
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
                      {task.jira_okr && (
                        <Badge variant="outline" className="text-xs">
                          {task.jira_okr.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {task.areas.map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTaskId} onOpenChange={() => setSelectedTaskId(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {taskDetails?.task?.title}
              {taskDetails?.task?.jira_task_key && (
                <Badge variant="outline">{taskDetails.task.jira_task_key}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Detalhes da tarefa e subtarefas criadas
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : taskDetails ? (
            <div className="space-y-6">
              {/* Task Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status={taskDetails.task.status} />
                  <span className="font-medium">
                    {statusConfig[taskDetails.task.status as keyof typeof statusConfig]?.label}
                  </span>
                </div>
                
                {taskDetails.task.description && (
                  <p className="text-sm text-muted-foreground">
                    {taskDetails.task.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  {taskDetails.task.sprint_label && (
                    <Badge variant="secondary">{taskDetails.task.sprint_label}</Badge>
                  )}
                  {taskDetails.task.areas.map((area) => (
                    <Badge key={area} variant="outline">{area}</Badge>
                  ))}
                </div>

                {taskDetails.task.jira_okr && (
                  <div className="text-sm text-muted-foreground mt-2">
                    <strong>OKR:</strong> {taskDetails.task.jira_okr.name}
                  </div>
                )}
              </div>

              {/* Subtasks */}
              <div>
                <h4 className="font-medium mb-3">
                  Subtarefas ({taskDetails.subtasks.length})
                </h4>
                <div className="space-y-2">
                  {taskDetails.subtasks.map((subtask) => (
                    <div 
                      key={subtask.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon status={subtask.status} />
                        <span className="text-sm">{subtask.subtask_name}</span>
                        {subtask.jira_area && (
                          <Badge variant="outline" className="text-xs">
                            {subtask.jira_area.label}
                          </Badge>
                        )}
                      </div>
                      {subtask.jira_subtask_key && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(
                            `https://sejaefi.atlassian.net/browse/${subtask.jira_subtask_key}`,
                            "_blank"
                          )}
                        >
                          {subtask.jira_subtask_key}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {taskDetails.task.jira_task_key && (
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => window.open(
                      `https://sejaefi.atlassian.net/browse/${taskDetails.task.jira_task_key}`,
                      "_blank"
                    )}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir no Jira
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
