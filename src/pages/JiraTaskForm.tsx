import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, X, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { useJiraOkrs, useJiraAreas, useCreateJiraTask } from "@/hooks/useJiraTasks";
import { getSprintOptions } from "@/types/jiraTask";
import { toast } from "sonner";

interface SelectedArea {
  id: string;
  name: string;
  label: string;
  subtasks: string[];
}

export default function JiraTaskForm() {
  const navigate = useNavigate();
  const { data: okrs, isLoading: okrsLoading } = useJiraOkrs();
  const { data: areas, isLoading: areasLoading } = useJiraAreas();
  const createTask = useCreateJiraTask();

  // Memoize sprint options to avoid recreating on every render
  const sprintOptions = useMemo(() => getSprintOptions(), []);
  
  // Get default sprint value
  const defaultSprint = useMemo(() => {
    const currentSprint = sprintOptions.find(s => s.label.includes("(atual)"));
    return currentSprint?.value || "";
  }, [sprintOptions]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOkrId, setSelectedOkrId] = useState<string>("");
  const [sprintLabel, setSprintLabel] = useState<string>(defaultSprint);
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([]);
  const [newSubtask, setNewSubtask] = useState<Record<string, string>>({});
  const [createdTask, setCreatedTask] = useState<{ key: string; url: string } | null>(null);

  const handleAreaToggle = (area: { id: string; name: string; label: string; default_subtasks: string[] }) => {
    const exists = selectedAreas.find(a => a.id === area.id);
    
    if (exists) {
      setSelectedAreas(selectedAreas.filter(a => a.id !== area.id));
    } else {
      setSelectedAreas([
        ...selectedAreas,
        {
          id: area.id,
          name: area.name,
          label: area.label,
          subtasks: [...area.default_subtasks],
        },
      ]);
    }
  };

  const handleRemoveSubtask = (areaId: string, subtaskIndex: number) => {
    setSelectedAreas(
      selectedAreas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            subtasks: area.subtasks.filter((_, i) => i !== subtaskIndex),
          };
        }
        return area;
      })
    );
  };

  const handleAddSubtask = (areaId: string) => {
    const subtaskName = newSubtask[areaId]?.trim();
    if (!subtaskName) return;

    setSelectedAreas(
      selectedAreas.map(area => {
        if (area.id === areaId) {
          return {
            ...area,
            subtasks: [...area.subtasks, subtaskName],
          };
        }
        return area;
      })
    );
    setNewSubtask({ ...newSubtask, [areaId]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (selectedAreas.length === 0) {
      toast.error("Selecione pelo menos uma área");
      return;
    }

    const hasEmptySubtasks = selectedAreas.some(area => area.subtasks.length === 0);
    if (hasEmptySubtasks) {
      toast.error("Cada área deve ter pelo menos uma subtarefa");
      return;
    }

    try {
      const result = await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        jira_okr_id: selectedOkrId || undefined,
        sprint_label: sprintLabel || undefined,
        areas: selectedAreas.map(a => a.name),
        subtasks: selectedAreas.map(area => ({
          area_id: area.id,
          area_label: area.label,
          subtask_names: area.subtasks,
        })),
      });

      if (result.task) {
        setCreatedTask({
          key: result.task.key,
          url: result.task.url,
        });
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  if (createdTask) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Tarefa Criada com Sucesso!</h2>
            <p className="text-muted-foreground mb-4">
              A tarefa <strong>{createdTask.key}</strong> foi criada no Jira com todas as subtarefas.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/jira-tasks")}>
                Voltar ao Dashboard
              </Button>
              <Button onClick={() => window.open(createdTask.url, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no Jira
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  setCreatedTask(null);
                  setTitle("");
                  setDescription("");
                  setSelectedAreas([]);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Outra
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jira-tasks")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Tarefa Jira</h1>
          <p className="text-muted-foreground">
            Crie uma tarefa com subtarefas automáticas por área
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Tarefa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Post Instagram - Natal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva os detalhes da tarefa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vincular a OKR/Épico</Label>
                {okrsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedOkrId} onValueChange={setSelectedOkrId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um OKR (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {okrs?.map((okr) => (
                        <SelectItem key={okr.id} value={okr.id}>
                          {okr.name}
                          {okr.jira_epic_key && ` (${okr.jira_epic_key})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sprint</Label>
                <Select value={sprintLabel} onValueChange={setSprintLabel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {sprintOptions.map((sprint) => (
                      <SelectItem key={sprint.value} value={sprint.value}>
                        {sprint.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Areas Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Áreas Envolvidas *</CardTitle>
            <CardDescription>
              Selecione as áreas que participarão desta tarefa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {areasLoading ? (
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-24" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {areas?.map((area) => {
                  const isSelected = selectedAreas.some(a => a.id === area.id);
                  return (
                    <label
                      key={area.id}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : "hover:bg-accent"
                      }`}
                    >
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => handleAreaToggle(area)}
                      />
                      <span className="font-medium">{area.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subtasks per Area */}
        {selectedAreas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Subtarefas por Área</CardTitle>
              <CardDescription>
                Edite as subtarefas que serão criadas para cada área
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedAreas.map((area) => (
                <div key={area.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{area.label}</Badge>
                    <span className="font-medium">{area.name}</span>
                  </div>
                  
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    {area.subtasks.map((subtask, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{subtask}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveSubtask(area.id, index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        placeholder="Nova subtarefa..."
                        value={newSubtask[area.id] || ""}
                        onChange={(e) => setNewSubtask({ ...newSubtask, [area.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubtask(area.id);
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSubtask(area.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/jira-tasks")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createTask.isPending}>
            {createTask.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando no Jira...
              </>
            ) : (
              "Criar Tarefa"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
