import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import api from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrdersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders?limit=100").then((res) => res.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const columns: ColumnDef<any>[] = [
    { accessorKey: "code", header: "Pedido" },
    { accessorKey: "client.name", header: "Cliente" },
    {
      accessorKey: "total",
      header: "Total",
      cell: (info) => formatCurrency(info.getValue() as number),
    },
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: (info) => formatDate(info.getValue() as string),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Select
          defaultValue={row.original.status}
          onValueChange={(val) =>
            statusMutation.mutate({ id: row.original.id, status: val })
          }
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUDGET">Orçamento</SelectItem>
            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
            <SelectItem value="IN_PRODUCTION">Em Produção</SelectItem>
            <SelectItem value="READY">Pronto</SelectItem>
            <SelectItem value="DELIVERED">Entregue</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">
          Acompanhe o fluxo de produção e entregas.
        </p>
      </div>
      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
    </div>
  );
}
