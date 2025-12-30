import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Copy, Trash2, BarChart3 } from "lucide-react";
import { TestStatus } from "@/types/test";
import { useNavigate } from "react-router-dom";
import { useCreateTest, useDeactivateTest } from "@/hooks/useTests";

export interface TestActionsDropdownProps {
  testId: string;
  status: TestStatus;
  test: any;
  onCollectData?: () => void;
}

export function TestActionsDropdown({
  testId,
  status,
  test,
  onCollectData,
}: TestActionsDropdownProps) {
  const navigate = useNavigate();
  const createTest = useCreateTest();
  const deactivateTest = useDeactivateTest();
  

  const handleEdit = () => {
    navigate(`/tests/${testId}/edit`);
  };

  const handleDuplicate = async () => {
    const { id, created_at, updated_at, created_by, updated_by, ...testData } = test;
    await createTest.mutateAsync({
      ...testData,
      nome_teste: `${testData.nome_teste} (cópia)`,
    });
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este teste?")) {
      await deactivateTest.mutateAsync(testId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background z-50">
        {onCollectData && (
          <DropdownMenuItem onClick={onCollectData}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Coletar dados
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
