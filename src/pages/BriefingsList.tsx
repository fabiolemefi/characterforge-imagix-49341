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
import { useBriefings } from "@/hooks/useBriefings";
import { BriefingStatus } from "@/types/briefing";
import { BriefingStatusBadge } from "@/components/briefings/BriefingStatusBadge";
import { BriefingFilters } from "@/components/briefings/BriefingFilters";
import { BriefingActionsDropdown } from "@/components/briefings/BriefingActionsDropdown";
import { format } from "date-fns";

export default function BriefingsList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<BriefingStatus | undefined>();
  const [createdByFilter, setCreatedByFilter] = useState<string | undefined>();

  const { data: briefings, isLoading } = useBriefings({
    status: statusFilter,
    createdBy: createdByFilter,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Briefings</h1>
        </div>
        <Button onClick={() => navigate("/briefings/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Briefing
        </Button>
      </div>

      <BriefingFilters
        status={statusFilter}
        createdBy={createdByFilter}
        onStatusChange={setStatusFilter}
        onCreatedByChange={setCreatedByFilter}
      />

      {isLoading ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Objetivo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Objetivo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {briefings?.map((briefing: any) => (
                <TableRow key={briefing.id}>
                  <TableCell className="font-medium text-base max-w-xs truncate">
                    {briefing.objetivo_final}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {briefing.prioridade_urgencia}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {briefing.publico}
                  </TableCell>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={briefing.profiles?.avatar_url} />
                      <AvatarFallback className="text-sm">
                        {(briefing.profiles?.full_name || briefing.profiles?.email || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <BriefingStatusBadge status={briefing.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(briefing.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <BriefingActionsDropdown briefingId={briefing.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!briefings || briefings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum briefing encontrado</p>
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
