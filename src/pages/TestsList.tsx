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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { useTests } from "@/hooks/useTests";
import { TestStatus, Test } from "@/types/test";
import { TestStatusBadge } from "@/components/tests/TestStatusBadge";
import { TestFilters } from "@/components/tests/TestFilters";
import { TestActionsDropdown } from "@/components/tests/TestActionsDropdown";
import { CollectDataModal } from "@/components/tests/CollectDataModal";
import { differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";

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
    <div className="space-y-6 p-6 max-w-full overflow-hidden">
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
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests?.map((test: any) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {test.nome_teste}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {test.start_date && test.end_date ? (
                      <span>{formatDuration(new Date(test.start_date), new Date(test.end_date))}</span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
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
                    <TestActionsDropdown
                      testId={test.id}
                      status={test.status}
                      test={test}
                      onCollectData={() => setCollectDataTest(test)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!tests || tests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
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
