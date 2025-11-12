import { Badge } from "@/components/ui/badge";
import { Lightbulb, Clock, FlaskConical, FileText } from "lucide-react";
import { TestStatus } from "@/types/test";

interface TestStatusBadgeProps {
  status: TestStatus;
}

const statusConfig = {
  planejamento: {
    label: "Planejamento",
    icon: Lightbulb,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200",
  },
  execucao: {
    label: "Execução",
    icon: Clock,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200",
  },
  analise: {
    label: "Análise",
    icon: FlaskConical,
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200",
  },
  documentacao: {
    label: "Documentação",
    icon: FileText,
    className: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200",
  },
};

export function TestStatusBadge({ status }: TestStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
