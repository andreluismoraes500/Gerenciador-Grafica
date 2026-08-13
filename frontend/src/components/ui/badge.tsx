import * as React from "react";
import { cn } from "@/lib/utils";
import { getStatusLabel, getPriorityLabel } from "@/lib/utils";

const variants = {
  default: "bg-primary/10 text-primary border-primary/20",
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  outline: "text-muted-foreground border-border",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const STATUS: Record<
  string,
  { label: string; variant: keyof typeof variants }
> = {
  BUDGET: { label: "Orçamento", variant: "warning" },
  CONFIRMED: { label: "Confirmado", variant: "info" },
  IN_PRODUCTION: { label: "Em Produção", variant: "default" },
  READY: { label: "Pronto", variant: "success" },
  DELIVERED: { label: "Entregue", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
  ANALYSIS: { label: "Em Análise", variant: "warning" },
  CREATING: { label: "Em Criação", variant: "info" },
  AWAITING_APPROVAL: { label: "Aguardando Aprovação", variant: "warning" },
  PRODUCTION: { label: "Em Produção", variant: "default" },
  COMPLETED: { label: "Concluído", variant: "success" },
  DRAFT: { label: "Rascunho", variant: "outline" },
  SENT: { label: "Enviado", variant: "info" },
  APPROVED: { label: "Aprovado", variant: "success" },
  REJECTED: { label: "Rejeitado", variant: "danger" },
  EXPIRED: { label: "Expirado", variant: "danger" },
  CONVERTED: { label: "Convertido", variant: "success" },
  PENDING: { label: "Pendente", variant: "warning" },
  PAID: { label: "Pago", variant: "success" },
  REFUNDED: { label: "Reembolsado", variant: "info" },
  TODO: { label: "A Fazer", variant: "outline" },
  IN_PROGRESS: { label: "Em Progresso", variant: "info" },
  DONE: { label: "Concluída", variant: "success" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || {
    label: getStatusLabel(status),
    variant: "outline" as const,
  };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const PRIORITY: Record<string, keyof typeof variants> = {
  LOW: "outline",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const label = getPriorityLabel(priority);
  return <Badge variant={PRIORITY[priority] || "outline"}>{label}</Badge>;
}
