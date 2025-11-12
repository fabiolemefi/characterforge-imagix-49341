import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestsMetrics } from "@/hooks/useTestsMetrics";
import { Lightbulb, Clock, FlaskConical, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = {
  planejamento: "#f59e0b",
  execucao: "#3b82f6",
  analise: "#a855f7",
  documentacao: "#22c55e",
};

export default function TestsDashboard() {
  const { data: metrics, isLoading } = useTestsMetrics();

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

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statusData = [
    { name: "Planejamento", value: metrics?.byStatus.planejamento || 0, color: COLORS.planejamento },
    { name: "Execução", value: metrics?.byStatus.execucao || 0, color: COLORS.execucao },
    { name: "Análise", value: metrics?.byStatus.analise || 0, color: COLORS.analise },
    { name: "Documentação", value: metrics?.byStatus.documentacao || 0, color: COLORS.documentacao },
  ];

  const typeData = Object.entries(metrics?.byType || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Testes</h1>
        
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-[#fff3eb] flex items-center justify-center">
                  <FlaskConical className="h-6 w-6 text-[#f37021]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Total de Testes</p>
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
                  <Lightbulb className="h-6 w-6 text-[#f37021]" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Planejamento</p>
                <div className="text-2xl font-bold">{metrics?.byStatus.planejamento || 0}</div>
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
                  <TrendingDown className="h-6 w-6 text-[#f37021]" />
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

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testes por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
