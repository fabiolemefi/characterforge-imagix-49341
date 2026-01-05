import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";
import { useJiraAreas, useCreateJiraArea, useUpdateJiraArea, useDeleteJiraArea } from "@/hooks/useJiraTasks";
import type { JiraArea } from "@/types/jiraTask";

export default function AdminJira() {
  const { data: areas, isLoading } = useJiraAreas();
  const createArea = useCreateJiraArea();
  const updateArea = useUpdateJiraArea();
  const deleteArea = useDeleteJiraArea();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<JiraArea | null>(null);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  const resetForm = () => {
    setName("");
    setLabel("");
    setSubtasks([]);
    setNewSubtask("");
    setEditingArea(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (area: JiraArea) => {
    setEditingArea(area);
    setName(area.name);
    setLabel(area.label);
    setSubtasks([...area.default_subtasks]);
    setIsFormOpen(true);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask("");
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !label.trim()) return;

    try {
      if (editingArea) {
        await updateArea.mutateAsync({
          id: editingArea.id,
          name: name.trim(),
          label: label.trim(),
          default_subtasks: subtasks,
        });
      } else {
        await createArea.mutateAsync({
          name: name.trim(),
          label: label.trim(),
          default_subtasks: subtasks,
        });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving area:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteAreaId) return;
    try {
      await deleteArea.mutateAsync(deleteAreaId);
      setDeleteAreaId(null);
    } catch (error) {
      console.error("Error deleting area:", error);
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Gerenciar Áreas Jira</h1>
            <p className="text-sm text-muted-foreground">
              Configure as áreas e suas subtarefas padrão
            </p>
          </div>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Área
          </Button>
        </header>

        <main className="p-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : areas?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhuma área cadastrada
                </p>
                <Button onClick={openCreateForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Área
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {areas?.map((area) => (
                <Card key={area.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          {area.name}
                        </CardTitle>
                        <CardDescription>
                          <Badge variant="secondary" className="mt-1">
                            {area.label}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(area)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAreaId(area.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Subtarefas padrão ({area.default_subtasks.length}):
                    </p>
                    <div className="space-y-1">
                      {area.default_subtasks.map((subtask, idx) => (
                        <div
                          key={idx}
                          className="text-sm py-1 px-2 bg-muted rounded"
                        >
                          {subtask}
                        </div>
                      ))}
                      {area.default_subtasks.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          Nenhuma subtarefa padrão
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Create/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingArea ? "Editar Área" : "Nova Área"}
              </DialogTitle>
              <DialogDescription>
                Configure o nome, label e subtarefas padrão da área
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Área *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Produção"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label (sigla) *</Label>
                <Input
                  id="label"
                  placeholder="Ex: PROD"
                  value={label}
                  onChange={(e) => setLabel(e.target.value.toUpperCase())}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Usado como prefixo nas subtarefas do Jira
                </p>
              </div>

              <div className="space-y-2">
                <Label>Subtarefas Padrão</Label>
                <div className="space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 text-sm py-2 px-3 bg-muted rounded">
                        {subtask}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubtask(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova subtarefa..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddSubtask}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !label.trim() || createArea.isPending || updateArea.isPending}
              >
                {editingArea ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteAreaId} onOpenChange={() => setDeleteAreaId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover área?</AlertDialogTitle>
              <AlertDialogDescription>
                A área será desativada e não aparecerá mais nas opções.
                Tarefas existentes não serão afetadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
