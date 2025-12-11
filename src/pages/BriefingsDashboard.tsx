import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBriefingsMetrics } from "@/hooks/useBriefingsMetrics";
import { FileEdit, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  rascunho: "#f59e0b",
  em_revisao: "#3b82f6",
  aprovado: "#a855f7",
  concluido: "#22c55e",
};

export default function BriefingsDashboard() {
  const { data: metrics, isLoading } = useBriefingsMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-9 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusData = [
    { name: "Rascunho", value: metrics?.byStatus.rascunho || 0, color: COLORS.rascunho },
    { name: "Em Revisão", value: metrics?.byStatus.em_revisao || 0, color: COLORS.em_revisao },
    { name: "Aprovado", value: metrics?.byStatus.aprovado || 0, color: COLORS.aprovado },
    { name: "Concluído", value: metrics?.byStatus.concluido || 0, color: COLORS.concluido },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Briefings</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#fff3eb] flex items-center justify-center">
                  <FileEdit className="h-6 w-6 text-[#f37021]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Total de Briefings</p>
                <div className="text-2xl font-bold">{metrics?.total || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#fff3eb] flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[#f37021]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Rascunhos</p>
                <div className="text-2xl font-bold">{metrics?.byStatus.rascunho || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#fff3eb] flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-[#f37021]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Em Andamento</p>
                <div className="text-2xl font-bold">{metrics?.inProgress || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#fff3eb] flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-[#f37021]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Concluídos</p>
                <div className="text-2xl font-bold">{metrics?.completed || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                style={{ fontSize: '12px' }}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
