import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface SharedFile {
  id: string;
  file_name: string;
  password_hash: string | null;
  expires_at: string | null;
}

interface EditFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: SharedFile | null;
}

// Função para criar hash de senha
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${salt}$${hashHex}`;
}

export function EditFileModal({ open, onOpenChange, file }: EditFileModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Resetar form quando modal abrir/fechar
  useEffect(() => {
    if (!open) {
      setPassword('');
      setConfirmPassword('');
      setRemovePassword(false);
      setExpirationDate(undefined);
    } else if (file) {
      // Carregar data de expiração atual se existir
      if (file.expires_at) {
        setExpirationDate(new Date(file.expires_at));
      }
    }
  }, [open, file]);

  const handleSubmit = async () => {
    if (!file) return;

    // Validar senha se preenchida (e não estiver removendo)
    if (password && !removePassword) {
      if (password.length !== 4 || !/^\d+$/.test(password)) {
        toast({
          title: 'Erro',
          description: 'A senha deve ter exatamente 4 dígitos numéricos',
          variant: 'destructive',
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: 'Erro',
          description: 'As senhas não coincidem',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('📝 Atualizando arquivo:', file.id);

      const updateData: any = {};

      // Remover senha se marcado
      if (removePassword) {
        updateData.password_hash = null;
        console.log('🔓 Senha removida - arquivo agora é público');
      }
      // Atualizar senha se fornecida
      else if (password) {
        const passwordHash = await hashPassword(password);
        updateData.password_hash = passwordHash;
        console.log('🔐 Nova senha definida');
      }

      // Atualizar data de expiração
      if (expirationDate) {
        updateData.expires_at = expirationDate.toISOString();
        console.log('📅 Nova data de expiração:', expirationDate);
      } else {
        // Se não há data selecionada, remover expiração
        updateData.expires_at = null;
        console.log('♾️ Expiração removida');
      }

      // Só atualizar se houver mudanças
      if (Object.keys(updateData).length === 0) {
        toast({
          title: 'Nenhuma alteração',
          description: 'Nenhum campo foi modificado',
        });
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from('shared_files')
        .update(updateData)
        .eq('id', file.id);

      if (error) throw error;

      console.log('✅ Arquivo atualizado com sucesso');

      toast({
        title: 'Arquivo atualizado!',
        description: 'As alterações foram salvas com sucesso',
      });

      queryClient.invalidateQueries({ queryKey: ['shared-files'] });
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Erro ao atualizar arquivo:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {file && (
            <div className="text-sm text-muted-foreground">
              <strong>Arquivo:</strong> {file.file_name}
            </div>
          )}

          <div className="space-y-4">
            {file?.password_hash && (
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                <Checkbox
                  id="removePassword"
                  checked={removePassword}
                  onCheckedChange={(checked) => {
                    setRemovePassword(checked as boolean);
                    if (checked) {
                      setPassword('');
                      setConfirmPassword('');
                    }
                  }}
                />
                <Label
                  htmlFor="removePassword"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remover senha e tornar arquivo público
                </Label>
              </div>
            )}

            {!removePassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha (opcional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="4 dígitos numéricos"
                    maxLength={4}
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para {file?.password_hash ? 'manter a senha atual' : 'não adicionar senha'}
                  </p>
                </div>

                {password && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="4 dígitos numéricos"
                      maxLength={4}
                      pattern="[0-9]*"
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Data de expiração (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !expirationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? (
                      format(expirationDate, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Sem data de expiração</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {expirationDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpirationDate(undefined)}
                  className="w-full"
                >
                  Remover data de expiração
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
