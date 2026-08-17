// frontend/src/features/dashboard/TopProducts.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Package } from "lucide-react";

export function TopProducts() {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-top-products", days],
    queryFn: () =>
      api
        .get(`/dashboard/top-products?limit=5&days=${days}`)
        .then((r) => r.data),
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );

  const maxTotal = data?.length
    ? Math.max(...data.map((item: any) => item._sum.totalPrice || 0))
    : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Tabs value={days} onValueChange={setDays}>
          <TabsList className="h-8">
            <TabsTrigger value="7" className="text-xs px-3 h-7">
              7d
            </TabsTrigger>
            <TabsTrigger value="30" className="text-xs px-3 h-7">
              30d
            </TabsTrigger>
            <TabsTrigger value="90" className="text-xs px-3 h-7">
              90d
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          {data?.length || 0} produtos
        </span>
      </div>

      <div className="space-y-2">
        {(data || []).map((item: any, i: number) => {
          const total = item._sum.totalPrice || 0;
          const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          const colors = [
            "bg-purple-500",
            "bg-blue-500",
            "bg-emerald-500",
            "bg-amber-500",
            "bg-rose-500",
          ];

          return (
            <div key={i} className="group">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground font-medium w-4">
                    {i + 1}
                  </span>
                  <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate font-medium">
                    {item.product?.name ||
                      `Produto ${item.productId?.slice(0, 8)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {item._sum.quantity || 0} un
                  </span>
                  <span className="font-semibold text-sm">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(width, 2)}%` }}
                />
              </div>
            </div>
          );
        })}

        {(!data || data.length === 0) && (
          <div className="text-sm text-muted-foreground text-center py-8">
            <TrendingUp className="h-8 w-8 mx-auto opacity-30 mb-2" />
            Nenhum produto vendido no período
          </div>
        )}
      </div>
    </div>
  );
}
