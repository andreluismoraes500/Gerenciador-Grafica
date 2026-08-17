// frontend/src/features/orders/OrdersPage.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Inbox,
  CheckCircle,
  Eye,
  X,
  User,
  Calendar,
  CreditCard,
  Package,
  DollarSign,
  Clock,
  Truck,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getPaymentMethodLabel,
} from "@/lib/utils";

const STATUSES = [
  "BUDGET",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED", "CANCELLED"];

// 🔍 Componente de Detalhes do Pedido
function OrderDetailsDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data),
    enabled: !!orderId && open,
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Pedido</span>
            {order && (
              <span className="text-sm font-mono text-muted-foreground">
                {order.code}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Status e informações gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={order.status} />
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Pagamento</p>
                <StatusBadge status={order.paymentStatus} />
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  {formatCurrency(order.total)}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            {/* ✅ Cliente - COM TELEFONE E EMAIL */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium text-base">{order.client?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.client?.document || "Sem documento"}
                  </p>
                </div>

                {/* ✅ Email do cliente */}
                {order.client?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${order.client.email}`}
                      className="text-primary hover:underline"
                    >
                      {order.client.email}
                    </a>
                  </div>
                )}

                {/* ✅ Telefone do cliente */}
                {(order.client?.phone || order.client?.mobile) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {order.client?.phone && (
                        <a
                          href={`tel:${order.client.phone}`}
                          className="text-primary hover:underline"
                        >
                          {order.client.phone}
                        </a>
                      )}
                      {order.client?.phone && order.client?.mobile && " • "}
                      {order.client?.mobile && (
                        <a
                          href={`tel:${order.client.mobile}`}
                          className="text-primary hover:underline"
                        >
                          {order.client.mobile}
                        </a>
                      )}
                    </span>
                  </div>
                )}

                {/* ✅ Endereço do cliente (se tiver) */}
                {order.client?.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {order.client.address.street},{" "}
                      {order.client.address.number}
                      {order.client.address.complement &&
                        ` - ${order.client.address.complement}`}
                      <br />
                      {order.client.address.district} -{" "}
                      {order.client.address.city}/{order.client.address.state}
                      <br />
                      CEP: {order.client.address.zipCode}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Itens do Pedido */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.product?.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4 space-x-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(order.subtotal)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div>
                      <span className="text-muted-foreground">Desconto:</span>
                      <span className="ml-2 font-medium text-red-500">
                        -{formatCurrency(order.discount)}
                      </span>
                    </div>
                  )}
                  {order.shippingCost > 0 && (
                    <div>
                      <span className="text-muted-foreground">Frete:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(order.shippingCost)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground font-bold">
                      Total:
                    </span>
                    <span className="ml-2 font-bold text-primary">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pagamento e Entrega */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {getStatusLabel(order.paymentStatus)}
                  </p>
                  {order.paidAt && (
                    <p className="text-sm text-muted-foreground">
                      Pago em: {formatDateTime(order.paidAt)}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.shippingAddress ? (
                    <>
                      <p className="font-medium">Endereço</p>
                      <p className="text-sm text-muted-foreground">
                        {order.shippingAddress}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem endereço informado
                    </p>
                  )}
                  {order.trackingCode && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Código de rastreio: {order.trackingCode}
                    </p>
                  )}
                  {order.dueDate && (
                    <p className="text-sm text-muted-foreground">
                      Previsão: {formatDate(order.dueDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Observações */}
            {order.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Pedido não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products-list"],
    queryFn: () =>
      api
        .get("/products", {
          params: { limit: 200 },
        })
        .then((r) => r.data.data || []),
  });

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

  // 🔍 Abrir detalhes do pedido
  const openDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsOpen(true);
  };

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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
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
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 flex items-center gap-1.5"
                      title="Ver detalhes"
                      onClick={() => openDetails(o.id)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-xs font-medium hidden sm:inline">
                        Detalhes
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de criação */}
      <Dialog open={open} onOpenChange={(v) => !v && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
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

            <div className="space-y-2">
              <Label>Itens do pedido *</Label>
              {productsLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <ItemsEditor items={items} onChange={setItems} />
              )}
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

      {/* 🔍 Dialog de Detalhes do Pedido */}
      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedOrderId(null);
        }}
      />
    </div>
  );
}
