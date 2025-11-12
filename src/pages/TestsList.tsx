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
import { Plus, BarChart3 } from "lucide-react";
import { useTests } from "@/hooks/useTests";
import { TestStatus } from "@/types/test";
import { TestStatusBadge } from "@/components/tests/TestStatusBadge";
import { TestFilters } from "@/components/tests/TestFilters";
import { TestActionsDropdown } from "@/components/tests/TestActionsDropdown";
import { PDFReportGenerator } from "@/components/tests/PDFReportGenerator";
import { format } from "date-fns";

export default function TestsList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TestStatus | undefined>();
  const [createdByFilter, setCreatedByFilter] = useState<string | undefined>();

  const { data: tests, isLoading } = useTests({
    status: statusFilter,
    createdBy: createdByFilter,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testes</h1>
          <p className="text-muted-foreground">Gerencie os testes cadastrados</p>
        </div>
        <Button onClick={() => navigate("/admin/tests/new")}>
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
                <TableHead>Status</TableHead>
                <TableHead>Nome do Teste</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-24" />
                  </TableCell>
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
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
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
                <TableHead>Status</TableHead>
                <TableHead>Nome do Teste</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests?.map((test: any) => (
                <TableRow key={test.id}>
                  <TableCell>
                    <TestStatusBadge status={test.status} />
                  </TableCell>
                  <TableCell className="font-medium">{test.nome_teste}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {test.test_types?.slice(0, 2).map((type: string) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                      {test.test_types?.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{test.test_types.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {test.start_date && test.end_date ? (
                      <span className="text-sm">
                        {format(new Date(test.start_date), "dd/MM/yyyy")} -{" "}
                        {format(new Date(test.end_date), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {test.profiles?.full_name || test.profiles?.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {test.status === "analise" && (
                        <Button variant="outline" size="sm" disabled>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Coletar dados
                        </Button>
                      )}
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
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum teste encontrado</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
