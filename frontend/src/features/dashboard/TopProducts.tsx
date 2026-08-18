// frontend/src/features/dashboard/TopProducts.tsx
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { useState } from "react";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TopProducts() {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-top-products", days],
    queryFn: () =>
      api.get(`/dashboard/top-products?limit=5&days=${days}`).then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[220px]" />;

  const products = Array.isArray(data) ? data : [];
  const maxTotal = Math.max(...products.map((p: any) => p._sum?.totalPrice || 0), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {["7", "30", "90"].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {products.length} produto(s)
        </span>
      </div>

      {products.length === 0 ? (
        <div className="h-[160px] flex flex-col items-center justify-center text-muted-foreground">
          <Package className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhuma venda no período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((item: any, i: number) => {
            const total = item._sum?.totalPrice || 0;
            const qty = item._sum?.quantity || 0;
            const pct = Math.round((total / maxTotal) * 100);

            return (
              <div key={item.productId}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-muted-foreground w-4">{i + 1}</span>
                    <span className="truncate font-medium">
                      {item.product?.name || "Produto removido"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                    <span>{qty} un</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(total)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
