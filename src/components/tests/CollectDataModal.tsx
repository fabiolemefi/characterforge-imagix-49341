import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUpdateTest } from "@/hooks/useTests";
import { Test } from "@/types/test";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

interface CollectDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: Test;
}

export function CollectDataModal({ open, onOpenChange, test }: CollectDataModalProps) {
  const [reportData, setReportData] = useState(test.insights || "");
  const updateTest = useUpdateTest();

  const handleSave = async () => {
    try {
      await updateTest.mutateAsync({
        id: test.id,
        insights: reportData,
      });
      toast.success("Dados coletados salvos com sucesso!");
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Coletar Dados - {test.nome_teste}</DialogTitle>
          <DialogDescription>
            Cole aqui os textos de relatório que você possui para análise do teste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-data">Dados do Relatório</Label>
            <RichTextEditor
              value={reportData}
              onChange={setReportData}
              placeholder="Cole aqui os dados do relatório, métricas, resultados, etc..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateTest.isPending}>
            {updateTest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
