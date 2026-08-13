import { useQuery } from "@tanstack/react-query";
import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import api from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";

const config: CrudConfig = {
  title: "Fluxo de Caixa",
  subtitle: "Contas a pagar, receber e movimentações",
  endpoint: "/transactions",
  columns: [
    {
      key: "description",
      header: "Descrição",
      render: (r) => r.description || r.category,
    },
    {
      key: "type",
      header: "Tipo",
      render: (r) => (r.type === "INCOME" ? "Receita" : "Despesa"),
    },
    { key: "amount", header: "Valor", render: (r) => formatCurrency(r.amount) },
    {
      key: "dueDate",
      header: "Vencimento",
      render: (r) => new Date(r.dueDate).toLocaleDateString("pt-BR"),
    },
    { key: "status", header: "Status", render: (r) => r.status },
  ],
  fields: [
    { name: "description", label: "Descrição", required: true, span: 2 },
    { name: "category", label: "Categoria", required: true },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      options: [
        { value: "INCOME", label: "Receita" },
        { value: "EXPENSE", label: "Despesa" },
      ],
      required: true,
    },
    {
      name: "amount",
      label: "Valor (R$)",
      type: "number",
      step: "0.01",
      required: true,
    },
    { name: "dueDate", label: "Vencimento", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "PENDING", label: "Pendente" },
        { value: "PAID", label: "Pago" },
      ],
    },
  ],
  defaultValues: { type: "EXPENSE", status: "PENDING" },
};

export function TransactionsPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["financial-summary"],
    queryFn: () => api.get("/transactions/summary").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" /> Receitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" /> Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalExpense)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" /> Saldo Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.balance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" /> Pendente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summary.pendingBalance)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <CrudPage config={config} />
    </div>
  );
}
