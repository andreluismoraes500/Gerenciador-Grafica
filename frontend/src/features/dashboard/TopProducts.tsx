import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";

export function TopProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-top-products"],
    queryFn: () =>
      api.get("/dashboard/top-products?limit=5").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[200px]" />;

  return (
    <div className="space-y-3">
      {(data || []).map((item: any, i: number) => (
        <div key={i} className="flex justify-between text-sm">
          <span>{item.productId}</span>
          <span className="font-medium">{item._sum.quantity} vendidos</span>
        </div>
      ))}
    </div>
  );
}
