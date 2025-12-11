import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIAssistants, useDeleteAIAssistant, useUpdateAIAssistant } from "@/hooks/useAIAssistants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAIAssistants() {
  const navigate = useNavigate();
  const { data: assistants, isLoading } = useAIAssistants();
  const deleteAssistant = useDeleteAIAssistant();
  const updateAssistant = useUpdateAIAssistant();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAssistant.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    await updateAssistant.mutateAsync({ id, is_active: !currentState });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-4 mb-8">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Assistentes IA</h1>
            </div>
            <Button
              onClick={() => navigate("/admin/ai-assistants/new")}
              className="ml-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Assistente
            </Button>
          </div>

          <p className="text-muted-foreground mb-6">
            Gerencie os assistentes de IA do sistema. Configure prompts, parâmetros do modelo e campos.
          </p>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : assistants?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum assistente cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  assistants?.map((assistant) => (
                    <TableRow key={assistant.id}>
                      <TableCell className="font-medium">{assistant.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {assistant.slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assistant.model_config?.model || "gpt-4-turbo-preview"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={assistant.is_active ? "default" : "secondary"}>
                          {assistant.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(assistant.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(assistant.id, assistant.is_active)}
                            title={assistant.is_active ? "Desativar" : "Ativar"}
                          >
                            {assistant.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/ai-assistants/${assistant.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(assistant.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Assistente</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este assistente? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </SidebarProvider>
  );
}
