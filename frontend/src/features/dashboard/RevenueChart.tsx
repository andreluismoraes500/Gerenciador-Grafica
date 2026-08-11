import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "@/api/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: () => api.get("/dashboard/revenue?months=12").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[300px]" />;

  const chartData = (data || []).map((d: any) => ({
    month: format(new Date(d.month), "MMM", { locale: ptBR }),
    total: Number(d.total),
    orders: Number(d.orders),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" className="text-xs" />
        <YAxis
          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
          className="text-xs"
        />
        <Tooltip
          formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#8b5cf6"
          fillOpacity={1}
          fill="url(#colorTotal)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
