import { BarChart3, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReporteiProjects } from "@/hooks/useReporteiProjects";

export default function Metricas() {
  const { data: projects, isLoading, error, refetch, isRefetching } = useReporteiProjects();

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
            Campanhas de mídia paga cadastradas no Google Ads via Reportei
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
              <TableHead className="w-[300px]">Projeto</TableHead>
              <TableHead>Conta Google Ads</TableHead>
              <TableHead>Tipo de Integração</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : projects && projects.length > 0 ? (
              // Data rows
              projects.flatMap((project) =>
                project.integrations.map((integration) => (
                  <TableRow key={`${project.id}-${integration.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {project.avatar ? (
                          <img
                            src={project.avatar}
                            alt={project.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {project.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {integration.source_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {integration.integration_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.open(
                            `https://app.reportei.com/clients/${project.slug}`,
                            '_blank'
                          );
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver no Reportei
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )
            ) : (
              // Empty state
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Nenhum projeto com Google Ads encontrado
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {projects && projects.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total: {projects.reduce((acc, p) => acc + p.integrations.length, 0)} integração(ões) 
          em {projects.length} projeto(s)
        </div>
      )}
    </div>
  );
}
