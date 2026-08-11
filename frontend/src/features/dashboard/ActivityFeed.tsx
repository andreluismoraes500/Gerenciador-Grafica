import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

export function ActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: () =>
      api.get("/dashboard/recent-activities?limit=10").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[200px]" />;

  return (
    <div className="space-y-3">
      {(data || []).map((act: any) => (
        <div key={act.id} className="flex flex-col text-sm">
          <span className="font-medium">{act.action}</span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(act.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
