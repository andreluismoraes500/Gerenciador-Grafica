import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Inbox } from "lucide-react";
import api from "@/api/client";
import { useList } from "@/components/crud/CrudPage";
import { ItemsEditor, ItemRow } from "@/components/crud/ItemsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUSES = [
  "BUDGET",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

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
  const clients = useList("/clients");
  const products = useList("/products?limit=200");

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  const createMut = useMutation({
    mutationFn: (payload: any) => api.post("/orders", payload),
    onSuccess: () => {
      toast.success("Pedido criado! 🎉");
      qc.invalidateQueries({ queryKey: ["orders"] });
      resetForm();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao criar pedido."),
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

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
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
                          label: s.replace(/_/g, " "),
                        }))}
                        onChange={(e) =>
                          statusMut.mutate({ id: o.id, status: e.target.value })
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={clientId}
                  placeholder="Selecione..."
                  options={clients.map((c: any) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Select
                  value={paymentMethod}
                  options={[
                    { value: "PIX", label: "Pix" },
                    { value: "CASH", label: "Dinheiro" },
                    { value: "CREDIT_CARD", label: "Cartão" },
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
            <div className="space-y-2">
              <Label>Itens do pedido *</Label>
              <ItemsEditor
                items={items}
                onChange={setItems}
                products={products}
              />
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
