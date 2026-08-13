import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, getStatusLabel } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Fez login",
  CREATE_ORDER: "Criou pedido",
  UPDATE_ORDER: "Atualizou pedido",
  DELETE_ORDER: "Excluiu pedido",
  CREATE_CLIENT: "Criou cliente",
  UPDATE_CLIENT: "Atualizou cliente",
  DELETE_CLIENT: "Excluiu cliente",
  CREATE_PROJECT: "Criou projeto",
  UPDATE_PROJECT: "Atualizou projeto",
  DELETE_PROJECT: "Excluiu projeto",
  CREATE_PRODUCT: "Criou produto",
  UPDATE_PRODUCT: "Atualizou produto",
  DELETE_PRODUCT: "Excluiu produto",
  CREATE_QUOTE: "Criou orçamento",
  UPDATE_QUOTE: "Atualizou orçamento",
  DELETE_QUOTE: "Excluiu orçamento",
};

const ENTITY_ROUTES: Record<string, string> = {
  Order: "/orders",
  Client: "/clients",
  Project: "/projects",
  Product: "/products",
  Quote: "/quotes",
};

export function ActivityFeed() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: () =>
      api.get("/dashboard/recent-activities?limit=10").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-[200px]" />;

  return (
    <div className="space-y-2">
      {(data || []).map((act: any) => {
        const route = ENTITY_ROUTES[act.entity] || "/";
        const actionLabel =
          ACTION_LABELS[act.action] || act.action.replace(/_/g, " ");

        return (
          <div
            key={act.id}
            className="flex flex-col text-sm p-2 hover:bg-accent/50 rounded cursor-pointer transition-colors"
            onClick={() => {
              if (act.entityId && route) {
                navigate(route);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{actionLabel}</span>
              {act.user && (
                <span className="text-xs text-muted-foreground">
                  {act.user.name}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {act.entity} #{act.entityId?.slice(0, 8)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(act.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
