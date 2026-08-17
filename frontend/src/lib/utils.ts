// frontend/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

// ✅ TODOS OS STATUS TRADUZIDOS PARA PORTUGUÊS
export const STATUS_LABELS: Record<string, string> = {
  // Pedidos
  BUDGET: 'Orçamento',
  CONFIRMED: 'Confirmado',
  IN_PRODUCTION: 'Em Produção',
  READY: 'Pronto',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  
  // Projetos
  ANALYSIS: 'Em Análise',
  CREATING: 'Em Criação',
  AWAITING_APPROVAL: 'Aguardando Aprovação',
  PRODUCTION: 'Em Produção',
  COMPLETED: 'Concluído',
  
  // Orçamentos
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
  CONVERTED: 'Convertido',
  
  // Pagamento
  PENDING: 'Pendente',
  PAID: 'Pago',
  REFUNDED: 'Reembolsado',
  
  // Tarefas
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Progresso',
  DONE: 'Concluída',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DESIGNER: 'Designer',
  ATTENDANT: 'Atendente',
  CLIENT: 'Cliente',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de Crédito',
  PIX: 'Pix',
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] || priority;
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] || method.replace(/_/g, ' ');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}