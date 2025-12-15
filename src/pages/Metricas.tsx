import { useState, useMemo } from "react";
import { BarChart3, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useReporteiAds, Ad } from "@/hooks/useReporteiAds";
import { MetricasModal } from "@/components/metricas/MetricasModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PlatformFilter = 'all' | 'meta' | 'google';
type StatusFilter = 'all' | 'active' | 'paused';

const ITEMS_PER_PAGE = 50;

export default function Metricas() {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: ads, isLoading, error, refetch, isRefetching } = useReporteiAds(platformFilter);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Filter ads by status
  const filteredAds = useMemo(() => {
    if (!ads) return [];
    if (statusFilter === 'all') return ads;
    return ads.filter(ad => ad.status === statusFilter);
  }, [ads, statusFilter]);

  // Paginate filtered ads
  const paginatedAds = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAds, currentPage]);

  const totalPages = Math.ceil(filteredAds.length / ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handlePlatformChange = (value: PlatformFilter) => {
    setPlatformFilter(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={platformFilter} onValueChange={(v) => handlePlatformChange(v as PlatformFilter)}>
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

        <Select value={statusFilter} onValueChange={(v) => handleStatusChange(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              <TableHead className="w-[140px]">Data de Cadastro</TableHead>
              <TableHead className="w-[350px]">Anúncio</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead className="text-right">Custo Investido</TableHead>
              <TableHead className="text-right">Interações</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Plataforma</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
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
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-20 mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedAds && paginatedAds.length > 0 ? (
              // Data rows
              paginatedAds.map((ad: Ad) => (
                <TableRow key={ad.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {ad.createdAt 
                      ? format(new Date(ad.createdAt), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[320px]" title={ad.name}>
                        {ad.name}
                      </span>
                      {ad.campaignName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[320px]" title={ad.campaignName}>
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
                      className={
                        ad.status === 'active' 
                          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                          : ad.status === 'paused'
                          ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {ad.status === 'active' ? 'Ativo' : ad.status === 'paused' ? 'Pausado' : '—'}
                    </Badge>
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
                      onClick={() => setSelectedAd(ad)}
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
                <TableCell colSpan={8} className="h-32 text-center">
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

      {/* Pagination */}
      {filteredAds.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredAds.length)} de {filteredAds.length} anúncios
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>
              
              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <span className="px-3 text-muted-foreground">...</span>
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Summary */}
      {ads && ads.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total: {filteredAds.length} anúncio(s)
          {platformFilter === 'all' && (
            <span className="ml-2">
              • {filteredAds.filter(a => a.platform === 'meta').length} Meta 
              • {filteredAds.filter(a => a.platform === 'google').length} Google
            </span>
          )}
        </div>
      )}

      {/* Metrics Modal */}
      <MetricasModal
        open={!!selectedAd}
        onOpenChange={(open) => !open && setSelectedAd(null)}
        ad={selectedAd}
      />
    </div>
  );
}
