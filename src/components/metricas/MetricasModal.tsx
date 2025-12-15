import { useState } from "react";
import { BarChart3, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard } from "./MetricCard";
import { useReporteiMetrics } from "@/hooks/useReporteiMetrics";

interface MetricasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  integrationId: string;
  integrationName: string;
}

export function MetricasModal({
  open,
  onOpenChange,
  projectName,
  integrationId,
  integrationName,
}: MetricasModalProps) {
  const [period, setPeriod] = useState<"7d" | "15d" | "30d">("30d");
  
  const { data, isLoading, error } = useReporteiMetrics(
    open ? integrationId : null,
    period
  );

  const getMetricIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("impress")) return "👁️";
    if (lowerName.includes("cliqu") || lowerName.includes("click")) return "👆";
    if (lowerName.includes("ctr")) return "📈";
    if (lowerName.includes("custo") || lowerName.includes("cost")) return "💰";
    if (lowerName.includes("convers")) return "🎯";
    if (lowerName.includes("cpa")) return "💵";
    if (lowerName.includes("cpc")) return "💳";
    return "📊";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl">
                  Métricas - {projectName}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {integrationName}
                </p>
              </div>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="15d">Últimos 15 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro ao carregar métricas</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Erro desconhecido"}
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <MetricCard
                  key={i}
                  name=""
                  value=""
                  isLoading
                />
              ))}
            </div>
          )}

          {data && data.metrics && data.metrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.metrics.map((metric) => {
                const rawValue = metric.value;
                let displayValue: string | number = "—";
                let comparison: { diff_percentage?: number } | null = null;
                
                if (rawValue !== null && typeof rawValue === "object" && "value" in rawValue) {
                  displayValue = rawValue.value;
                  comparison = rawValue.comparison ?? null;
                } else if (rawValue !== null && (typeof rawValue === "string" || typeof rawValue === "number")) {
                  displayValue = rawValue;
                }

                return (
                  <MetricCard
                    key={metric.id}
                    name={metric.name}
                    value={displayValue ?? "—"}
                    diffPercentage={comparison?.diff_percentage}
                    icon={<span className="text-lg">{getMetricIcon(metric.name)}</span>}
                  />
                );
              })}
            </div>
          )}

          {data && (!data.metrics || data.metrics.length === 0) && (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma métrica disponível para esta integração
              </p>
            </div>
          )}

          {data?.message && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              ℹ️ {data.message}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
          <p>
            📅 Período: últimos {period === "7d" ? "7" : period === "15d" ? "15" : "30"} dias
          </p>
          <p>📊 Comparação: vs. período anterior</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
