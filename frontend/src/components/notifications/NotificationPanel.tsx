import { useQuery } from "@tanstack/react-query";
import { X, Bell, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import api from "@/api/client";

const iconMap: Record<string, any> = {
  SUCCESS: { icon: CheckCircle, color: "text-green-500" },
  WARNING: { icon: AlertCircle, color: "text-yellow-500" },
  ERROR: { icon: AlertCircle, color: "text-red-500" },
  INFO: { icon: Info, color: "text-blue-500" },
};

export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get("/dashboard/recent-activities?limit=15").then((r) => r.data),
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-96 bg-card h-full border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="font-semibold">Notificações</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activities.map((act: any) => {
                const Icon = iconMap[act.type]?.icon || Info;
                const color =
                  iconMap[act.type]?.color || "text-muted-foreground";
                return (
                  <div
                    key={act.id}
                    className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-0.5", color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {act.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {act.entity}{" "}
                          {act.entityId && `#${act.entityId.slice(0, 6)}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(act.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
