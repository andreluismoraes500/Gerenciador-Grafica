export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-80 bg-card h-full border-l p-4">
        <h2 className="font-semibold">Notificações</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Nenhuma notificação.
        </p>
      </div>
    </div>
  );
}
