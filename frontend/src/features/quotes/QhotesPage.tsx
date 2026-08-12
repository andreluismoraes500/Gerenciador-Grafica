import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FileDown, RefreshCw, Inbox } from "lucide-react";
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

export function QuotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () =>
      api.get("/quotes", { params: { limit: 50 } }).then((r) => r.data),
  });
  const clients = useList("/clients");
  const products = useList("/products?limit=200");

  const createMut = useMutation({
    mutationFn: (p: any) => api.post("/quotes", p),
    onSuccess: () => {
      toast.success("Orçamento criado!");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      reset();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao criar orçamento."),
  });
  const convertMut = useMutation({
    mutationFn: (id: string) =>
      api.post(`/quotes/${id}/convert-to-order`, { paymentMethod: "PIX" }),
    onSuccess: () => {
      toast.success("Convertido em pedido! 🎉");
      qc.invalidateQueries();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao converter."),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) =>
      api.patch(`/quotes/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const openPdf = async (id: string) => {
    const res = await api.get(`/quotes/${id}/pdf`, { responseType: "blob" });
    window.open(URL.createObjectURL(res.data), "_blank");
  };
  const reset = () => {
    setOpen(false);
    setClientId("");
    setItems([]);
    setValidUntil("");
  };
  const submit = () =>
    createMut.mutate({
      clientId,
      validUntil: new Date(
        (validUntil || new Date().toISOString().slice(0, 10)) + "T12:00:00",
      ).toISOString(),
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
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Propostas comerciais com PDF e conversão em pedido
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Válido até</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
                    <p className="text-sm">Nenhum orçamento.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {q.number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {q.client?.name}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(q.total)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(q.validUntil)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={q.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Baixar PDF"
                        onClick={() => openPdf(q.id)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      {q.status !== "CONVERTED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Converter em pedido"
                          onClick={() => convertMut.mutate(q.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {q.status === "DRAFT" && (
                        <Select
                          className="h-8 w-28 text-xs"
                          value=""
                          placeholder="Ações..."
                          options={[
                            { value: "SENT", label: "Marcar enviado" },
                            { value: "APPROVED", label: "Aprovado" },
                            { value: "REJECTED", label: "Rejeitado" },
                          ]}
                          onChange={(e) =>
                            e.target.value &&
                            statusMut.mutate({
                              id: q.id,
                              status: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && reset()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Itens *</Label>
              <ItemsEditor
                items={items}
                onChange={setItems}
                products={products}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
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
                Criar Orçamento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
