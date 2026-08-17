// frontend/src/features/quotes/QuotesPage.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FileDown, RefreshCw, Inbox, Pencil, Trash2 } from "lucide-react";
import api from "@/api/client";
import { ItemsEditor, ItemRow } from "@/components/crud/ItemsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  SearchSelect,
  SearchSelectOption,
} from "@/components/ui/search-select";
import { formatCurrency, formatDate } from "@/lib/utils";

export function QuotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [clientId, setClientId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () =>
      api.get("/quotes", { params: { limit: 50 } }).then((r) => r.data),
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

  const createMut = useMutation({
    mutationFn: (p: any) => api.post("/quotes", p),
    onSuccess: () => {
      toast.success("Orçamento criado!");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao criar orçamento.";
      toast.error(msg);
    },
  });

  // ✅ CORREÇÃO: Mutation para atualizar com os dados corretos
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return api.put(`/quotes/${id}`, data);
    },
    onSuccess: (response) => {
      toast.success("Orçamento atualizado!");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao atualizar orçamento.";
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/${id}`),
    onSuccess: () => {
      toast.success("Orçamento excluído!");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao excluir orçamento.";
      toast.error(msg);
    },
  });

  const convertMut = useMutation({
    mutationFn: (id: string) =>
      api.post(`/quotes/${id}/convert-to-order`, { paymentMethod: "PIX" }),
    onSuccess: () => {
      toast.success("Convertido em pedido! 🎉");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao converter.";
      toast.error(msg);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/quotes/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao atualizar status.";
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditingQuote(null);
    setClientId("");
    setItems([]);
    setValidUntil("");
  };

  const openCreate = () => {
    setEditingQuote(null);
    setClientId("");
    setItems([]);
    setValidUntil("");
    setOpen(true);
  };

  const openEdit = (quote: any) => {
    console.log("[openEdit] Editando orçamento:", quote);
    setEditingQuote(quote);
    setClientId(quote.clientId);
    setValidUntil(quote.validUntil ? quote.validUntil.split("T")[0] : "");
    setItems(
      quote.items?.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })) || [],
    );
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      deleteMut.mutate(id);
    }
  };

  // ✅ CORREÇÃO: Submit com dados completos
  const submit = () => {
    const payload = {
      clientId,
      validUntil: new Date(
        (validUntil || new Date().toISOString().slice(0, 10)) + "T12:00:00",
      ).toISOString(),
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };

    console.log("[submit] Payload:", payload);

    if (editingQuote) {
      updateMut.mutate({ id: editingQuote.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const openPdf = async (id: string) => {
    try {
      const res = await api.get(`/quotes/${id}/pdf`, { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch (error) {
      toast.error("Erro ao gerar PDF");
    }
  };

  const canEdit = (status: string) => status === "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Propostas comerciais com PDF e conversão em pedido
          </p>
        </div>
        <Button onClick={openCreate}>
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
                    <Button variant="outline" size="sm" onClick={openCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeiro orçamento
                    </Button>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {canEdit(q.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5"
                          title="Editar orçamento"
                          onClick={() => openEdit(q)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">
                            Editar
                          </span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 flex items-center gap-1.5"
                        title="Baixar PDF"
                        onClick={() => openPdf(q.id)}
                      >
                        <FileDown className="h-4 w-4" />
                        <span className="text-xs font-medium hidden sm:inline">
                          PDF
                        </span>
                      </Button>

                      {q.status !== "CONVERTED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                          title="Converter em pedido"
                          onClick={() => convertMut.mutate(q.id)}
                          disabled={convertMut.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">
                            Converter
                          </span>
                        </Button>
                      )}

                      {canEdit(q.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir orçamento"
                          onClick={() => handleDelete(q.id)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">
                            Excluir
                          </span>
                        </Button>
                      )}
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
            <DialogTitle>
              {editingQuote ? "Editar Orçamento" : "Novo Orçamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  createMut.isPending ||
                  updateMut.isPending
                }
                onClick={submit}
              >
                {createMut.isPending || updateMut.isPending
                  ? "Salvando..."
                  : editingQuote
                    ? "Atualizar Orçamento"
                    : "Criar Orçamento"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
