// frontend/src/features/dashboard/RevenueChart.tsx
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function RevenueChart() {
  const [period, setPeriod] = useState("6");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-revenue", period],
    queryFn: () =>
      api.get(`/dashboard/revenue?months=${period}`).then((r) => r.data),
    // Evita cache "preso" em uma resposta antiga vazia
    staleTime: 30_000,
  });

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => {
      // 🔥 CORREÇÃO: "2026-08-01" não pode virar `new Date(item.month)`,
      // pois o JS interpreta isso como UTC meia-noite e, convertido pro
      // horário local (ex.: UTC-3), volta um dia — deslocando o mês
      // inteiro (Agosto virava Julho). Parseamos manualmente como data
      // LOCAL para não sofrer esse deslocamento de fuso horário.
      const [year, month] = item.month.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      const label = `${MONTH_LABELS[date.getMonth()]}/${String(
        date.getFullYear(),
      ).slice(2)}`;

      return {
        month: label,
        total: Number(item.total) || 0,
        orders: Number(item.orders) || 0,
      };
    });
  }, [data]);

  const hasData = chartData.some((d) => d.total > 0);

  if (isLoading) return <Skeleton className="h-[280px]" />;

  if (isError) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <p className="text-sm font-medium text-red-500">
          Erro ao carregar faturamento
        </p>
        <p className="text-xs">Verifique o console do backend para detalhes</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-1 mb-3">
        {["6", "12"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p} meses
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground">
          <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum dado de faturamento</p>
          <p className="text-xs">
            Os dados aparecerão quando houver pedidos pagos
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs"
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
              }
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "total"
                  ? [formatCurrency(value), "Faturamento"]
                  : [value, "Pedidos"]
              }
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
