import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
];

export function StatusPieChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-status"],
    queryFn: () =>
      api.get("/dashboard/status-distribution").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[250px]" />;

  const chartData = (data || []).map((d: any) => ({
    name: d.status,
    value: d._count,
  }));

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
          label
        >
          {chartData.map((_: any, i: number) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
