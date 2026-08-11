import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Palette,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "./RevenueChart";
import { StatusPieChart } from "./StatusPieChart";
import { TopProducts } from "./TopProducts";
import { ActivityFeed } from "./ActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/api/client";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => api.get("/dashboard/metrics").then((r) => r.data),
  });

  const cards = data
    ? [
        {
          title: "Faturamento Mensal",
          value: `R$ ${data.monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          icon: DollarSign,
          trend: data.revenueDelta,
          color: "text-green-600",
        },
        {
          title: "Pedidos Totais",
          value: data.totalOrders,
          icon: ShoppingCart,
          color: "text-blue-600",
        },
        {
          title: "Clientes Ativos",
          value: data.activeClients,
          icon: Users,
          color: "text-purple-600",
        },
        {
          title: "Projetos em Andamento",
          value: data.inProgressProjects,
          icon: Palette,
          color: "text-orange-600",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta! Aqui está o resumo do seu estúdio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))
          : cards.map((card, i) => (
              <motion.div
                key={card.title}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {card.title}
                        </p>
                        <p className="text-2xl font-bold mt-1">{card.value}</p>
                        {card.trend !== undefined && (
                          <div
                            className={cn(
                              "flex items-center gap-1 text-xs mt-1",
                              card.trend >= 0
                                ? "text-green-600"
                                : "text-red-600",
                            )}
                          >
                            {card.trend >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(card.trend).toFixed(1)}% vs mês anterior
                          </div>
                        )}
                      </div>
                      <card.icon className={cn("h-10 w-10", card.color)} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProducts />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}
