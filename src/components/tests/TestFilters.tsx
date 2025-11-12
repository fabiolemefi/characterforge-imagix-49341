import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestStatus } from "@/types/test";
import { useTestCreators } from "@/hooks/useTests";

interface TestFiltersProps {
  status?: TestStatus;
  createdBy?: string;
  onStatusChange: (status?: TestStatus) => void;
  onCreatedByChange: (userId?: string) => void;
}

export function TestFilters({
  status,
  createdBy,
  onStatusChange,
  onCreatedByChange,
}: TestFiltersProps) {
  const { data: creators } = useTestCreators();

  return (
    <div className="flex gap-4">
      <Select
        value={status || "all"}
        onValueChange={(value) =>
          onStatusChange(value === "all" ? undefined : (value as TestStatus))
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="planejamento">Planejamento</SelectItem>
          <SelectItem value="execucao">Execução</SelectItem>
          <SelectItem value="analise">Análise</SelectItem>
          <SelectItem value="documentacao">Documentação</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={createdBy || "all"}
        onValueChange={(value) =>
          onCreatedByChange(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os usuários" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os usuários</SelectItem>
          {creators?.map((creator: any) => (
            <SelectItem key={creator.id} value={creator.id}>
              {creator.full_name || creator.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
