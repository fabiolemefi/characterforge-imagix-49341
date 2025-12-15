import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, BarChart3 } from "lucide-react";
import { useTests } from "@/hooks/useTests";
import { TestStatus, Test } from "@/types/test";
import { TestStatusBadge } from "@/components/tests/TestStatusBadge";
import { TestFilters } from "@/components/tests/TestFilters";
import { TestActionsDropdown } from "@/components/tests/TestActionsDropdown";
import { PDFReportGenerator } from "@/components/tests/PDFReportGenerator";
import { CollectDataModal } from "@/components/tests/CollectDataModal";
import { format, differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";

const formatDuration = (startDate: Date, endDate: Date): string => {
  const days = Math.abs(differenceInDays(endDate, startDate));
  const weeks = Math.abs(differenceInWeeks(endDate, startDate));
  const months = Math.abs(differenceInMonths(endDate, startDate));

  if (days <= 7) {
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  } else if (weeks <= 4) {
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
};

export default function TestsList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TestStatus | undefined>();
  const [createdByFilter, setCreatedByFilter] = useState<string | undefined>();
  const [collectDataTest, setCollectDataTest] = useState<Test | null>(null);

  const { data: tests, isLoading } = useTests({
    status: statusFilter,
    createdBy: createdByFilter,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testes</h1>
        </div>
        <Button onClick={() => navigate("/tests/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Teste
        </Button>
      </div>

      <TestFilters
        status={statusFilter}
        createdBy={createdByFilter}
        onStatusChange={setStatusFilter}
        onCreatedByChange={setCreatedByFilter}
      />

      {isLoading ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Métricas</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Métricas</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests?.map((test: any) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium text-base">{test.nome_teste}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {test.test_types?.slice(0, 2).map((type: string) => (
                        <Badge key={type} className="text-xs bg-muted/70 text-muted-foreground">
                          {type}
                        </Badge>
                      ))}
                      {test.test_types?.length > 2 && (
                        <Badge className="text-xs bg-muted/70 text-muted-foreground">
                          +{test.test_types.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {test.success_metric?.slice(0, 2).map((metric: string) => (
                        <Badge key={metric} className="text-xs bg-muted/70 text-muted-foreground">
                          {metric}
                        </Badge>
                      ))}
                      {test.success_metric?.length > 2 && (
                        <Badge className="text-xs bg-muted/70 text-muted-foreground">
                          +{test.success_metric.length - 2}
                        </Badge>
                      )}
                      {(!test.success_metric || test.success_metric.length === 0) && (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {test.start_date && test.end_date ? (
                      <span className="text-base">
                        {formatDuration(new Date(test.start_date), new Date(test.end_date))}
                      </span>
                    ) : (
                      <span className="text-base text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={test.profiles?.avatar_url} />
                      <AvatarFallback className="text-sm">
                        {(test.profiles?.full_name || test.profiles?.email || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <TestStatusBadge status={test.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCollectDataTest(test)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Coletar dados
                      </Button>
                      {test.status === "documentacao" && (
                        <PDFReportGenerator test={test} />
                      )}
                      <TestActionsDropdown
                        testId={test.id}
                        status={test.status}
                        test={test}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!tests || tests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum teste encontrado</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {collectDataTest && (
        <CollectDataModal
          open={!!collectDataTest}
          onOpenChange={(open) => !open && setCollectDataTest(null)}
          test={collectDataTest}
        />
      )}
    </div>
  );
}
