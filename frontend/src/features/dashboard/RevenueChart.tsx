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
} from "recharts";
import api from "@/api/client";
import { format, parseISO, isValid, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: () => api.get("/dashboard/revenue?months=12").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[300px]" />;

  // ✅ CORREÇÃO: Processar os dados com validação
  const chartData = (data || [])
    .filter((d: any) => d && d.month) // Remove dados inválidos
    .map((d: any) => {
      let date: Date | null = null;

      // Tenta criar a data de diferentes formas
      if (typeof d.month === "string") {
        // Se for string no formato 'YYYY-MM-DD'
        if (d.month.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = parseISO(d.month + "T00:00:00");
        } else {
          // Tenta parse direto
          date = parseISO(d.month);
        }
      } else if (d.month instanceof Date) {
        date = d.month;
      } else if (typeof d.month === "number") {
        date = new Date(d.month);
      }

      // Se a data for inválida, usa o início do mês atual
      if (!date || !isValid(date)) {
        console.warn("[RevenueChart] Data inválida recebida:", d.month);
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
    // Ordena por data
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

  // Formatação para o tooltip em português
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Custom tooltip para exibir informações detalhadas
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

  // Se não houver dados, mostra uma mensagem
  if (!chartData.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

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
        <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
          className="text-xs"
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#8b5cf6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorTotal)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
