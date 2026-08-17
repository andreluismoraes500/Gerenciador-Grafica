// frontend/src/features/dashboard/StatusPieChart.tsx
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusLabel } from "@/lib/utils";

const COLORS = [
  "#8b5cf6", // Roxo
  "#3b82f6", // Azul
  "#22c55e", // Verde
  "#f59e0b", // Amarelo
  "#ef4444", // Vermelho
  "#6b7280", // Cinza
  "#ec4899", // Rosa
  "#14b8a6", // Teal
];

export function StatusPieChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-status"],
    queryFn: () =>
      api.get("/dashboard/status-distribution").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[250px]" />;

  const chartData = (data || []).map((d: any) => ({
    name: getStatusLabel(d.status), // Traduzido para português
    value: d._count,
    rawStatus: d.status,
  }));

  // Formatação para o tooltip em português
  const formatTooltip = (value: number, name: string) => {
    return [`${value} pedido(s)`, name];
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {chartData.map((_: any, i: number) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formatTooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}
