// frontend/src/features/dashboard/StatusPieChart.tsx
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusLabel } from "@/lib/utils";
import { useMemo } from "react";

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

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // 🔥 Dados de exemplo quando não há pedidos
      return [{ name: "Sem pedidos", value: 1, rawStatus: "EMPTY" }];
    }

    const total = data.reduce(
      (sum: number, d: any) => sum + (d._count || 0),
      0,
    );

    if (total === 0) {
      return [{ name: "Sem pedidos", value: 1, rawStatus: "EMPTY" }];
    }

    return data.map((d: any) => ({
      name: getStatusLabel(d.status),
      value: d._count || 0,
      rawStatus: d.status,
      percent: (d._count / total) * 100,
    }));
  }, [data]);

  if (isLoading) return <Skeleton className="h-[280px]" />;

  if (!chartData.length || chartData[0]?.rawStatus === "EMPTY") {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-32 h-32 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <p className="text-sm font-medium">Nenhum pedido cadastrado</p>
        <p className="text-xs">
          Os status aparecerão aqui quando houver pedidos
        </p>
      </div>
    );
  }

  const formatTooltip = (value: number, name: string) => {
    if (name === "Sem pedidos") return ["0 pedidos", "Sem dados"];
    return [`${value} pedido(s)`, name];
  };

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    // Não mostrar label para "Sem pedidos" ou percentual muito baixo
    if (name === "Sem pedidos" || percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Filtrar "Sem pedidos" para não aparecer no gráfico se houver outros dados
  const displayData = chartData.filter((d: any) => d.rawStatus !== "EMPTY");
  const hasRealData =
    displayData.length > 0 && displayData.some((d: any) => d.value > 0);

  if (!hasRealData) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-32 h-32 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <p className="text-sm font-medium">Nenhum pedido cadastrado</p>
        <p className="text-xs">
          Os status aparecerão aqui quando houver pedidos
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={displayData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={85}
          innerRadius={45}
          label={CustomLabel}
          labelLine={false}
          animationDuration={800}
          animationBegin={200}
        >
          {displayData.map((_: any, i: number) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          ))}
        </Pie>
        <Tooltip formatter={formatTooltip} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
