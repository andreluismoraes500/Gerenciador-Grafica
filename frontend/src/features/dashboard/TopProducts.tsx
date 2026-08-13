import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export function TopProducts() {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-top-products", days],
    queryFn: () =>
      api
        .get(`/dashboard/top-products?limit=5&days=${days}`)
        .then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[200px]" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Top 5 produtos por faturamento
        </h3>
        <Select
          className="w-32 h-8 text-xs"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          options={[
            { value: "7", label: "Últimos 7 dias" },
            { value: "30", label: "Últimos 30 dias" },
            { value: "90", label: "Últimos 90 dias" },
          ]}
        />
      </div>
      <div className="space-y-2">
        {(data || []).map((item: any, i: number) => (
          <div
            key={i}
            className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded"
          >
            <div className="flex-1">
              <p className="font-medium">
                {item.product?.name || `Produto ${item.productId?.slice(0, 8)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {item._sum.quantity} vendidos
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {formatCurrency(item._sum.totalPrice || 0)}
              </p>
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum produto vendido no período
          </p>
        )}
      </div>
    </div>
  );
}
