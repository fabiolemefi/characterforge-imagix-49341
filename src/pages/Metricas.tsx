import { useState } from "react";
import { BarChart3, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReporteiAds, Ad } from "@/hooks/useReporteiAds";
import { MetricasModal } from "@/components/metricas/MetricasModal";

type PlatformFilter = 'all' | 'meta' | 'google';

interface SelectedAd {
  projectName: string;
  integrationId: string;
  integrationName: string;
}

export default function Metricas() {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const { data: ads, isLoading, error, refetch, isRefetching } = useReporteiAds(platformFilter);
  const [selectedAd, setSelectedAd] = useState<SelectedAd | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Métricas
          </h1>
          <p className="text-muted-foreground mt-1">
            Anúncios de mídia paga cadastrados via Reportei
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Platform Filter */}
      <Tabs value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="meta">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Meta Ads
            </span>
          </TabsTrigger>
          <TabsTrigger value="google">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Google Ads
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Anúncio</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead className="text-right">Custo Investido</TableHead>
              <TableHead className="text-right">Interações</TableHead>
              <TableHead className="text-center">Plataforma</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-20 mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : ads && ads.length > 0 ? (
              // Data rows
              ads.map((ad: Ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[350px]" title={ad.name}>
                        {ad.name}
                      </span>
                      {ad.campaignName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[350px]" title={ad.campaignName}>
                          {ad.campaignName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ad.projectName}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(ad.cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(ad.interactions)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="secondary"
                      className={ad.platform === 'meta' 
                        ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' 
                        : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
                      }
                    >
                      {ad.platform === 'meta' ? 'Meta' : 'Google'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAd({
                        projectName: ad.projectName,
                        integrationId: ad.integrationId,
                        integrationName: ad.platform === 'meta' ? 'Meta Ads' : 'Google Ads',
                      })}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Ver métricas
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // Empty state
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Nenhum anúncio encontrado
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {ads && ads.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total: {ads.length} anúncio(s)
          {platformFilter === 'all' && (
            <span className="ml-2">
              • {ads.filter(a => a.platform === 'meta').length} Meta 
              • {ads.filter(a => a.platform === 'google').length} Google
            </span>
          )}
        </div>
      )}

      {/* Metrics Modal */}
      <MetricasModal
        open={!!selectedAd}
        onOpenChange={(open) => !open && setSelectedAd(null)}
        projectName={selectedAd?.projectName ?? ""}
        integrationId={selectedAd?.integrationId ?? ""}
        integrationName={selectedAd?.integrationName ?? ""}
      />
    </div>
  );
}
