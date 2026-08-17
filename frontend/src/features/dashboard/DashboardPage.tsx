// frontend/src/features/dashboard/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Palette,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "./RevenueChart";
import { StatusPieChart } from "./StatusPieChart";
import { TopProducts } from "./TopProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import api from "@/api/client";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const navigate = useNavigate();

  // Métricas principais
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => api.get("/dashboard/metrics").then((r) => r.data),
  });

  // Entregas próximas
  const { data: upcomingDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["dashboard-deliveries"],
    queryFn: () =>
      api.get("/dashboard/upcoming-deliveries?days=7").then((r) => r.data),
  });

  // Estoque baixo
  const { data: lowStock, isLoading: stockLoading } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: () => api.get("/dashboard/low-stock-alerts").then((r) => r.data),
  });

  // Cards de métricas
  const cards = metrics
    ? [
        {
          title: "Faturamento Mensal",
          value: `R$ ${(metrics.monthRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          icon: DollarSign,
          trend: metrics.revenueDelta,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          detail: `vs R$ ${(metrics.lastMonthRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} mês anterior`,
        },
        {
          title: "Pedidos",
          value: metrics.totalOrders || 0,
          icon: ShoppingCart,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950/30",
          detail: `${metrics.pendingOrders || 0} pendentes`,
        },
        {
          title: "Clientes Ativos",
          value: metrics.activeClients || 0,
          icon: Users,
          color: "text-purple-600",
          bg: "bg-purple-50 dark:bg-purple-950/30",
          detail: "base de clientes",
        },
        {
          title: "Projetos em Andamento",
          value: metrics.inProgressProjects || 0,
          icon: Palette,
          color: "text-orange-600",
          bg: "bg-orange-50 dark:bg-orange-950/30",
          detail: "em produção/criação",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do seu estúdio gráfico
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Atualizado em tempo real</span>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))
          : cards.map((card, i) => (
              <motion.div
                key={card.title}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-gradient-to-br from-card to-card/80">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">
                          {card.title}
                        </p>
                        <p className="text-2xl font-bold mt-1 tracking-tight">
                          {card.value}
                        </p>
                        {card.trend !== undefined && (
                          <div
                            className={cn(
                              "flex items-center gap-1 text-xs mt-1 font-medium",
                              card.trend >= 0
                                ? "text-emerald-600"
                                : "text-red-600",
                            )}
                          >
                            {card.trend >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(card.trend).toFixed(1)}%
                            <span className="text-muted-foreground font-normal">
                              {card.detail}
                            </span>
                          </div>
                        )}
                        {card.detail && card.trend === undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {card.detail}
                          </p>
                        )}
                      </div>
                      <div className={cn("p-3 rounded-xl", card.bg)}>
                        <card.icon className={cn("h-5 w-5", card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Gráficos - 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Faturamento Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-sm border-0 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Status dos Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPieChart />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Linha inferior: Top Produtos + Alertas e Entregas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-sm border-0 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Produtos Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopProducts />
            </CardContent>
          </Card>
        </motion.div>

        {/* Alertas e Entregas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-sm border-0 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Alertas & Entregas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estoque baixo */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Estoque Baixo
                </p>
                {stockLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (lowStock || []).length > 0 ? (
                  <div className="space-y-2">
                    {(lowStock || []).slice(0, 3).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {item.name}
                          </span>
                        </div>
                        <Badge
                          variant="danger"
                          className="text-[10px] flex-shrink-0"
                        >
                          {item.stock} un
                        </Badge>
                      </div>
                    ))}
                    {(lowStock || []).length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{(lowStock || []).length - 3} outros itens
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                      Todos os produtos com estoque ok
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                {/* Entregas próximas */}
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Truck className="h-3 w-3" />
                  Entregas nos próximos 7 dias
                </p>
                {deliveriesLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (upcomingDeliveries || []).length > 0 ? (
                  <div className="space-y-2">
                    {(upcomingDeliveries || [])
                      .slice(0, 3)
                      .map((order: any) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate("/orders")}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {order.client?.name || "Cliente"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.code}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="warning" className="text-[10px]">
                              {order.dueDate
                                ? formatDate(order.dueDate)
                                : "Sem prazo"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Nenhuma entrega prevista</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
