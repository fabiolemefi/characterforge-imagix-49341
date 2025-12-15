import { useState } from "react";
import { BarChart3, AlertCircle, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MetricCard } from "./MetricCard";
import { useReporteiMetrics, DateRange } from "@/hooks/useReporteiMetrics";
import { Ad } from "@/hooks/useReporteiAds";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MetricasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: Ad | null;
}

export function MetricasModal({
  open,
  onOpenChange,
  ad,
}: MetricasModalProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const { data, isLoading, error } = useReporteiMetrics(
    open && ad ? ad.integrationId : null,
    dateRange
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (!ad) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl">
                  {ad.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {ad.projectName} • {ad.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                </p>
              </div>
            </div>
            
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </DialogHeader>

        {/* Ad Summary Metrics */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <MetricCard
            name="Custo Investido"
            value={formatCurrency(ad.cost)}
            icon={<span className="text-lg">💰</span>}
          />
          <MetricCard
            name="Interações"
            value={formatNumber(ad.interactions)}
            icon={<span className="text-lg">👆</span>}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Métricas da Integração
          </h3>

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
            📅 Período selecionado: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} a {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
          </p>
          <p>📊 Comparação: vs. período anterior de mesma duração</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
