import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Copy, Ban } from "lucide-react";
import { TestStatus } from "@/types/test";
import { useNavigate } from "react-router-dom";
import { useCreateTest, useDeactivateTest } from "@/hooks/useTests";

interface TestActionsDropdownProps {
  testId: string;
  status: TestStatus;
  test: any;
}

export function TestActionsDropdown({
  testId,
  status,
  test,
}: TestActionsDropdownProps) {
  const navigate = useNavigate();
  const createTest = useCreateTest();
  const deactivateTest = useDeactivateTest();
  const isDisabled = status !== "planejamento";

  const handleEdit = () => {
    navigate(`/admin/tests/${testId}/edit`);
  };

  const handleDuplicate = async () => {
    const { id, created_at, updated_at, created_by, updated_by, ...testData } = test;
    await createTest.mutateAsync({
      ...testData,
      nome_teste: `${testData.nome_teste} (cópia)`,
    });
  };

  const handleDeactivate = async () => {
    if (confirm("Tem certeza que deseja desativar este teste?")) {
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
        <DropdownMenuItem onClick={handleEdit} disabled={isDisabled}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate} disabled={isDisabled}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDeactivate} disabled={isDisabled}>
          <Ban className="h-4 w-4 mr-2" />
          Desativar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
