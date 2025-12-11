import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BriefingStatus } from "@/types/briefing";
import { useBriefingCreators } from "@/hooks/useBriefings";

interface BriefingFiltersProps {
  status?: BriefingStatus;
  createdBy?: string;
  onStatusChange: (status: BriefingStatus | undefined) => void;
  onCreatedByChange: (createdBy: string | undefined) => void;
}

export function BriefingFilters({
  status,
  createdBy,
  onStatusChange,
  onCreatedByChange,
}: BriefingFiltersProps) {
  const { data: creators = [] } = useBriefingCreators();

  return (
    <div className="flex gap-4">
      <Select
        value={status || "all"}
        onValueChange={(value) =>
          onStatusChange(value === "all" ? undefined : (value as BriefingStatus))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="rascunho">Rascunho</SelectItem>
          <SelectItem value="em_revisao">Em Revisão</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={createdBy || "all"}
        onValueChange={(value) =>
          onCreatedByChange(value === "all" ? undefined : value)
        }
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Filtrar por autor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os autores</SelectItem>
          {creators.map((creator: any) => (
            <SelectItem key={creator.id} value={creator.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={creator.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {(creator.full_name || creator.email || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{creator.full_name || creator.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
