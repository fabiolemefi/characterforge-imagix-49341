import { Badge } from "@/components/ui/badge";
import { BriefingStatus } from "@/types/briefing";

const statusConfig: Record<BriefingStatus, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  em_revisao: {
    label: "Em Revisão",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  concluido: {
    label: "Concluído",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
};

interface BriefingStatusBadgeProps {
  status: BriefingStatus;
}

export function BriefingStatusBadge({ status }: BriefingStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
