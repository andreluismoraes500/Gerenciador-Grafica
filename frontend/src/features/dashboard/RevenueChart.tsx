// frontend/src/features/dashboard/RevenueChart.tsx
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  ComposedChart,
  Legend,
} from "recharts";
import api from "@/api/client";
import { format, parseISO, isValid, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function RevenueChart() {
  const [period, setPeriod] = useState("12");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-revenue", period],
    queryFn: () =>
      api.get(`/dashboard/revenue?months=${period}`).then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[300px]" />;

  // Processar dados
  const chartData = (data || [])
    .filter((d: any) => d && d.month)
    .map((d: any) => {
      let date: Date | null = null;

      if (typeof d.month === "string") {
        if (d.month.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = parseISO(d.month + "T00:00:00");
        } else {
          date = parseISO(d.month);
        }
      } else if (d.month instanceof Date) {
        date = d.month;
      } else if (typeof d.month === "number") {
        date = new Date(d.month);
      }

      if (!date || !isValid(date)) {
        date = startOfMonth(new Date());
      }

      return {
        month: format(date, "MMM", { locale: ptBR }),
        fullMonth: format(date, "MMMM yyyy", { locale: ptBR }),
        total: Number(d.total) || 0,
        orders: Number(d.orders) || 0,
        date: date,
      };
    })
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Verificar se há dados reais
  const hasData = chartData.some((d: any) => d.total > 0 || d.orders > 0);

  if (!hasData) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center mb-3">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-sm font-medium">Nenhum dado de faturamento</p>
        <p className="text-xs">
          Os dados aparecerão quando houver pedidos pagos
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm">{data.fullMonth}</p>
          <p className="text-sm text-muted-foreground">
            Faturamento:{" "}
            <span className="font-medium text-primary">
              {formatCurrency(data.total)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Pedidos: <span className="font-medium">{data.orders}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calcular total e média
  const totalRevenue = chartData.reduce(
    (sum: number, d: any) => sum + d.total,
    0,
  );
  const avgRevenue = totalRevenue / chartData.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Média: </span>
            <span className="font-medium">{formatCurrency(avgRevenue)}</span>
          </div>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="h-8">
            <TabsTrigger value="6" className="text-xs px-3 h-7">
              6m
            </TabsTrigger>
            <TabsTrigger value="12" className="text-xs px-3 h-7">
              12m
            </TabsTrigger>
            <TabsTrigger value="24" className="text-xs px-3 h-7">
              24m
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tick={{ fontSize: 11 }}
            interval={period === "6" ? 0 : 1}
          />
          <YAxis
            tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            className="text-xs"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                total: "Faturamento",
                orders: "Pedidos",
              };
              return labels[value] || value;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="total"
          />
          <Bar
            dataKey="orders"
            fill="#3b82f6"
            opacity={0.5}
            radius={[4, 4, 0, 0]}
            barSize={30}
            name="orders"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
