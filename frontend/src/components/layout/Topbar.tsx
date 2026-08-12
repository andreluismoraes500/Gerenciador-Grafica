import { Bell, Moon, Sun, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";

export function Topbar({
  onNotificationsClick,
}: {
  onNotificationsClick: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();

  const { data: notifData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () =>
      api.get("/dashboard/recent-activities?limit=1").then((r) => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.length || 0;

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium leading-tight">
            {user?.name}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {user?.role?.toLowerCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-9 w-9"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNotificationsClick}
          className="h-9 w-9 relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="h-9 w-9 text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
