import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";

export function Topbar({
  onNotificationsClick,
}: {
  onNotificationsClick: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <span className="text-sm text-muted-foreground">
        Olá, <strong>{user?.name}</strong>
      </span>
      <Button variant="ghost" size="icon" onClick={onNotificationsClick}>
        <Bell className="h-5 w-5" />
      </Button>
    </header>
  );
}
