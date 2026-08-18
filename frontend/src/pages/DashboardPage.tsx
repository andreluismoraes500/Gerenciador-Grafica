// frontend/src/pages/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueChart } from "@/features/dashboard/RevenueChart";
import { StatusPieChart } from "@/features/dashboard/StatusPieChart";
import { TopProducts } from "@/features/dashboard/TopProducts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Palette,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Package,
} from "lucide-react";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  delta,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  delta?: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {delta !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              delta >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {delta >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => api.get("/dashboard/metrics").then((r) => r.data),
  });

  const { data: deliveries } = useQuery({
    queryKey: ["dashboard-deliveries"],
    queryFn: () => api.get("/dashboard/upcoming-deliveries?days=7").then((r) => r.data),
  });

  const { data: lowStock } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: () => api.get("/dashboard/low-stock-alerts").then((r) => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do seu estúdio gráfico
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Atualizado em tempo real
        </div>
      </div>

      {/* Cards de métricas */}
      {loadingMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Faturamento Mensal"
            value={formatCurrency(metrics?.monthRevenue || 0)}
            subtitle={`vs ${formatCurrency(metrics?.lastMonthRevenue || 0)} mês anterior`}
            delta={metrics?.revenueDelta}
            icon={DollarSign}
            iconBg="#dcfce7"
            iconColor="#16a34a"
          />
          <MetricCard
            title="Pedidos"
            value={String(metrics?.totalOrders ?? 0)}
            subtitle={`${metrics?.pendingOrders ?? 0} pendentes`}
            icon={ShoppingCart}
            iconBg="#dbeafe"
            iconColor="#2563eb"
          />
          <MetricCard
            title="Clientes Ativos"
            value={String(metrics?.activeClients ?? 0)}
            subtitle="base de clientes"
            icon={Users}
            iconBg="#f3e8ff"
            iconColor="#9333ea"
          />
          <MetricCard
            title="Projetos em Andamento"
            value={String(metrics?.inProgressProjects ?? 0)}
            subtitle="em produção/criação"
            icon={Palette}
            iconBg="#fff7ed"
            iconColor="#ea580c"
          />
        </div>
      )}

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1 font-semibold text-sm">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Faturamento Mensal
          </div>
          <RevenueChart />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            Status dos Pedidos
          </div>
          <StatusPieChart />
        </Card>
      </div>

      {/* Top produtos + alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
            <Package className="w-4 h-4 text-indigo-600" />
            Produtos Mais Vendidos
          </div>
          <TopProducts />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            Alertas & Entregas
          </div>

          <div className="space-y-4">
            {lowStock && lowStock.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Estoque Baixo
                </p>
                <div className="space-y-2">
                  {lowStock.slice(0, 4).map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-red-700 font-medium truncate">
                        {p.name}
                      </span>
                      <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 shrink-0">
                        {p.stock} un
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliveries && deliveries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Entregas nos próximos 7 dias
                </p>
                <div className="space-y-2">
                  {deliveries.slice(0, 4).map((o: any) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-amber-700 font-medium truncate">
                        {o.client?.name} — {o.code}
                      </span>
                      <span className="text-xs text-amber-600 shrink-0">
                        {new Date(o.dueDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!lowStock || lowStock.length === 0) &&
              (!deliveries || deliveries.length === 0) && (
                <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Tudo em dia, nenhum alerta no momento</p>
                </div>
              )}
          </div>
        </Card>
      </div>
    </div>
  );
}
