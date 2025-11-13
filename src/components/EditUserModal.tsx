import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onUserUpdated: () => void;
}

export function EditUserModal({
  open,
  onOpenChange,
  profile,
  onUserUpdated,
}: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setJobTitle(profile.job_title || "");
      setIsActive(profile.is_active);
      setIsAdmin(profile.is_admin);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          job_title: jobTitle,
          is_active: isActive,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      // Handle admin role
      if (isAdmin !== profile.is_admin) {
        if (isAdmin) {
          // Add admin role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert([{ user_id: profile.id, role: "admin" }]);

          if (roleError) throw roleError;
        } else {
          // Remove admin role
          const { error: roleError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", profile.id)
            .eq("role", "admin");

          if (roleError) throw roleError;
        }
      }

      toast({
        title: "Usuário atualizado",
        description: "As informações foram salvas com sucesso",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: profile.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao deletar usuário');
      }

      toast({
        title: "Usuário deletado",
        description: "O usuário foi removido do sistema",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (!profile) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>
                {profile.full_name?.charAt(0) || profile.email.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile.email}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(profile.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Digite o nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Cargo</Label>
              <Input
                id="job_title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Digite o cargo"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">
                  {isActive ? "Usuário ativo" : "Usuário inativo"}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Administrador</Label>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? "Tem privilégios de admin" : "Sem privilégios de admin"}
                </p>
              </div>
              <Switch
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar Usuário
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar o usuário <strong>{profile.full_name || profile.email}</strong>? 
            Esta ação não pode ser desfeita e todos os dados do usuário serão permanentemente removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deletando..." : "Deletar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
