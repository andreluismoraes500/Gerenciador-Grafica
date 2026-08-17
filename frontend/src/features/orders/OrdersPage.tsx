// frontend/src/features/orders/OrdersPage.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Inbox, CheckCircle } from "lucide-react";
import api from "@/api/client";
import { ItemsEditor, ItemRow } from "@/components/crud/ItemsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SearchSelect,
  SearchSelectOption,
} from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";

const STATUSES = [
  "BUDGET",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED", "CANCELLED"];

export function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", search],
    queryFn: () =>
      api
        .get("/orders", { params: { limit: 50, search: search || undefined } })
        .then((r) => r.data),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () =>
      api
        .get("/clients", {
          params: { limit: 200 },
        })
        .then((r) => r.data.data || []),
  });

  const clientOptions: SearchSelectOption[] = useMemo(() => {
    if (!clients) return [];
    return clients.map((c: any) => ({
      value: c.id,
      label: c.name,
      subLabel: c.document ? `CPF/CNPJ: ${c.document}` : c.email || "",
    }));
  }, [clients]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const paymentMut = useMutation({
    mutationFn: ({
      id,
      paymentStatus,
    }: {
      id: string;
      paymentStatus: string;
    }) => api.patch(`/orders/${id}/payment`, { paymentStatus }),
    onSuccess: () => {
      toast.success("Pagamento atualizado!");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || "Erro ao atualizar pagamento.");
    },
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/orders", payload),
    onSuccess: () => {
      toast.success("Pedido criado! 🎉");
      qc.invalidateQueries({ queryKey: ["orders"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao criar pedido.";
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setClientId("");
    setItems([]);
    setDueDate("");
    setPaymentMethod("PIX");
  };

  const submit = () =>
    createMut.mutate({
      clientId,
      paymentMethod,
      dueDate: dueDate
        ? new Date(dueDate + "T12:00:00").toISOString()
        : undefined,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Fluxo de produção, pagamentos e entregas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-30" />
                    <p className="text-sm">
                      Nenhum pedido ainda. Crie o primeiro!
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {o.code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {o.client?.name}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(o.total)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(o.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <Select
                        className="h-8 w-36 text-xs"
                        value={o.status}
                        options={STATUSES.map((s) => ({
                          value: s,
                          label: getStatusLabel(s),
                        }))}
                        onChange={(e) =>
                          statusMut.mutate({ id: o.id, status: e.target.value })
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.paymentStatus} />
                      {o.paymentStatus === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            if (confirm("Confirmar pagamento deste pedido?")) {
                              paymentMut.mutate({
                                id: o.id,
                                paymentStatus: "PAID",
                              });
                            }
                          }}
                          disabled={paymentMut.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Dar baixa
                        </Button>
                      )}
                      <Select
                        className="h-8 w-32 text-xs"
                        value={o.paymentStatus}
                        options={PAYMENT_STATUSES.map((s) => ({
                          value: s,
                          label: getStatusLabel(s),
                        }))}
                        onChange={(e) =>
                          paymentMut.mutate({
                            id: o.id,
                            paymentStatus: e.target.value,
                          })
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* ✅ Cliente - SEM controle externo, usa busca interna */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <SearchSelect
                  value={clientId}
                  onChange={(value) => setClientId(value)}
                  options={clientOptions}
                  placeholder="Buscar cliente por nome ou documento..."
                  isLoading={clientsLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Select
                  value={paymentMethod}
                  options={[
                    { value: "PIX", label: "Pix" },
                    { value: "CASH", label: "Dinheiro" },
                    { value: "CREDIT_CARD", label: "Cartão de Crédito" },
                    { value: "BOLETO", label: "Boleto" },
                  ]}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entrega</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ Itens - com ProductSearchSelect que usa controle externo */}
            <div className="space-y-2">
              <Label>Itens do pedido *</Label>
              <ItemsEditor items={items} onChange={setItems} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                disabled={
                  !clientId ||
                  items.length === 0 ||
                  items.some((i) => !i.productId) ||
                  createMut.isPending
                }
                onClick={submit}
              >
                {createMut.isPending ? "Criando..." : "Criar Pedido"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
