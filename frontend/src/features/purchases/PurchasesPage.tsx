// frontend/src/features/purchases/PurchasesPage.tsx

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Inbox,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Truck,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// Schema de validação
const purchaseItemSchema = z.object({
  stockItemId: z.string().min(1, "Selecione um insumo"),
  name: z.string().min(1, "Nome do insumo é obrigatório"),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que zero"),
  unitPrice: z.number().min(0, "Preço unitário não pode ser negativo"),
  total: z.number().min(0),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  items: z.array(purchaseItemSchema).min(1, "Adicione pelo menos um item"),
  discount: z.number().min(0).default(0),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  status: z
    .enum(["DRAFT", "PENDING", "PAID", "RECEIVED", "CANCELLED"])
    .default("DRAFT"),
});

type PurchaseForm = z.infer<typeof purchaseSchema>;
type PurchaseItem = z.infer<typeof purchaseItemSchema>;

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
  { value: "RECEIVED", label: "Recebido" },
  { value: "CANCELLED", label: "Cancelado" },
];

// Componente de detalhes da compra
function PurchaseDetailsDialog({
  purchaseId,
  open,
  onClose,
}: {
  purchaseId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchase-details", purchaseId],
    queryFn: () => api.get(`/purchases/${purchaseId}`).then((r) => r.data),
    enabled: !!purchaseId && open,
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Compra</span>
            {purchase && (
              <span className="text-sm font-mono text-muted-foreground">
                {purchase.code}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : purchase ? (
          <div className="space-y-6">
            {/* Status e informações gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={purchase.status} />
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                <p className="text-sm font-medium">{purchase.supplier?.name}</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  {formatCurrency(purchase.total)}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm font-medium">
                  {formatDate(purchase.createdAt)}
                </p>
              </div>
            </div>

            {/* Itens */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Itens da Compra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4 space-x-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(purchase.subtotal)}
                    </span>
                  </div>
                  {purchase.discount > 0 && (
                    <div>
                      <span className="text-muted-foreground">Desconto:</span>
                      <span className="ml-2 font-medium text-red-500">
                        -{formatCurrency(purchase.discount)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground font-bold">
                      Total:
                    </span>
                    <span className="ml-2 font-bold text-primary">
                      {formatCurrency(purchase.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {purchase.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {purchase.notes}
                  </p>
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
            Compra não encontrada
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Componente de seleção de insumo
function StockItemSearchSelect({
  value,
  onChange,
  onItemSelect,
  placeholder = "Buscar insumo...",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onItemSelect?: (item: any) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["stock-items-select", debouncedSearch],
    queryFn: () =>
      api
        .get("/stock-items", {
          params: {
            limit: 50,
            search: debouncedSearch || undefined,
          },
        })
        .then((r) => r.data.data || []),
    enabled: true,
  });

  const options: SearchSelectOption[] = useMemo(() => {
    if (!items) return [];
    return items.map((item: any) => ({
      value: item.id,
      label: item.name,
      subLabel: `${item.category || "Sem categoria"} • Estoque: ${item.quantity} ${item.unit} • Custo: R$ ${item.unitCost.toFixed(2)}`,
    }));
  }, [items]);

  const handleSelect = (val: string) => {
    onChange(val);
    if (onItemSelect && val) {
      const item = items?.find((i: any) => i.id === val);
      if (item) onItemSelect(item);
    }
    setSearch("");
  };

  return (
    <SearchSelect
      value={value}
      onChange={handleSelect}
      options={options}
      placeholder={placeholder}
      isLoading={isLoading}
      disabled={disabled}
      onSearchChange={setSearch}
      searchValue={search}
    />
  );
}

// Componente de edição de itens
function PurchaseItemsEditor({
  items,
  onChange,
}: {
  items: PurchaseItem[];
  onChange: (items: PurchaseItem[]) => void;
}) {
  const setItem = (idx: number, patch: Partial<PurchaseItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    onChange([
      ...items,
      { stockItemId: "", name: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleItemSelect = (idx: number, stockItem: any) => {
    const quantity = items[idx]?.quantity || 1;
    const unitPrice = stockItem.unitCost || 0;
    setItem(idx, {
      stockItemId: stockItem.id,
      name: stockItem.name,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    });
  };

  const handleQuantityChange = (idx: number, quantity: number) => {
    const item = items[idx];
    setItem(idx, {
      quantity,
      total: quantity * (item.unitPrice || 0),
    });
  };

  const handlePriceChange = (idx: number, unitPrice: number) => {
    const item = items[idx];
    setItem(idx, {
      unitPrice,
      total: (item.quantity || 1) * unitPrice,
    });
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">Nenhum item adicionado</p>
          <p className="text-xs">Clique em "Adicionar item" para começar</p>
        </div>
      ) : (
        items.map((it, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-center gap-2 p-3 bg-muted/30 rounded-lg"
          >
            <div className="col-span-5">
              <StockItemSearchSelect
                value={it.stockItemId}
                onChange={(val) => setItem(idx, { stockItemId: val })}
                onItemSelect={(item) => handleItemSelect(idx, item)}
                placeholder="Buscar insumo..."
              />
            </div>

            <div className="col-span-2">
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={it.quantity || ""}
                placeholder="Qtd"
                className="h-10"
                onChange={(e) =>
                  handleQuantityChange(idx, Number(e.target.value) || 0)
                }
              />
            </div>

            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={it.unitPrice || ""}
                placeholder="Preço"
                className="h-10"
                onChange={(e) =>
                  handlePriceChange(idx, Number(e.target.value) || 0)
                }
              />
            </div>

            <div className="col-span-1 text-sm font-semibold text-right">
              {formatCurrency(it.total)}
            </div>

            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="border-dashed"
        >
          <Plus className="mr-1 h-3 w-3" />
          Adicionar item
        </Button>
        <div className="text-sm font-semibold">
          Total: <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function PurchasesPage() {
  const qc = useQueryClient();
  const { permissions } = usePermissions();
  const canManage = permissions.canManageFinance;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(
    null,
  );

  // Buscar compras
  const { data, isLoading } = useQuery({
    queryKey: ["purchases", search, page],
    queryFn: () =>
      api
        .get("/purchases", {
          params: { page, limit: 10, search: search || undefined },
        })
        .then((r) => r.data),
    placeholderData: (p) => p,
  });

  // Buscar fornecedores
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers-select"],
    queryFn: () =>
      api
        .get("/suppliers", {
          params: { limit: 200 },
        })
        .then((r) => r.data.data || []),
  });

  const supplierOptions: SearchSelectOption[] = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.map((s: any) => ({
      value: s.id,
      label: s.name,
      subLabel: s.document ? `CNPJ: ${s.document}` : s.email || "",
    }));
  }, [suppliers]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      items: [],
      discount: 0,
      status: "DRAFT",
    },
  });

  const supplierId = watch("supplierId");
  const items = watch("items") || [];
  const status = watch("status");

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: PurchaseForm) => api.post("/purchases", data),
    onSuccess: () => {
      toast.success("Compra criada com sucesso! 🎉");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao criar compra.";
      toast.error(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseForm> }) =>
      api.put(`/purchases/${id}`, data),
    onSuccess: () => {
      toast.success("Compra atualizada!");
      qc.invalidateQueries({ queryKey: ["purchases"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao atualizar compra.";
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/purchases/${id}`),
    onSuccess: () => {
      toast.success("Compra excluída!");
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao excluir compra.";
      toast.error(msg);
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/purchases/${id}/status`, { status }),
    onSuccess: (response) => {
      const purchase = response.data;
      const statusLabels: Record<string, string> = {
        RECEIVED: "recebida e estoque atualizado",
        PAID: "paga",
        CANCELLED: "cancelada",
      };
      toast.success(
        `Compra ${statusLabels[purchase.status] || `status atualizado para ${purchase.status}`}!`,
      );
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      setDetailsOpen(false);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao atualizar status.";
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditingPurchase(null);
    reset({
      supplierId: "",
      items: [],
      discount: 0,
      dueDate: "",
      notes: "",
      status: "DRAFT",
    });
  };

  const openCreate = () => {
    if (!canManage) {
      toast.error("Você não tem permissão para criar compras.");
      return;
    }
    setEditingPurchase(null);
    reset({
      supplierId: "",
      items: [],
      discount: 0,
      dueDate: "",
      notes: "",
      status: "DRAFT",
    });
    setOpen(true);
  };

  const openEdit = (purchase: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para editar compras.");
      return;
    }
    if (purchase.status === "RECEIVED" || purchase.status === "PAID") {
      toast.error("Compras recebidas ou pagas não podem ser editadas.");
      return;
    }
    setEditingPurchase(purchase);
    reset({
      supplierId: purchase.supplierId,
      items: purchase.items || [],
      discount: purchase.discount || 0,
      dueDate: purchase.dueDate ? purchase.dueDate.split("T")[0] : "",
      notes: purchase.notes || "",
      status: purchase.status,
    });
    setOpen(true);
  };

  const handleDelete = (purchase: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para excluir compras.");
      return;
    }
    if (purchase.status !== "DRAFT") {
      toast.error("Apenas compras em rascunho podem ser excluídas.");
      return;
    }
    if (confirm(`Excluir a compra "${purchase.code}"?`)) {
      deleteMut.mutate(purchase.id);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (!canManage) {
      toast.error("Você não tem permissão para alterar status.");
      return;
    }
    const confirmMessage: Record<string, string> = {
      RECEIVED: "Confirmar recebimento? Isso atualizará o estoque.",
      PAID: "Confirmar pagamento?",
      CANCELLED: "Cancelar esta compra?",
    };
    if (confirmMessage[newStatus] && !confirm(confirmMessage[newStatus])) {
      return;
    }
    updateStatusMut.mutate({ id, status: newStatus });
  };

  const handleOpenDetails = (id: string) => {
    setSelectedPurchaseId(id);
    setDetailsOpen(true);
  };

  const onSubmit = (data: PurchaseForm) => {
    if (editingPurchase) {
      updateMut.mutate({ id: editingPurchase.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const rows = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Verifica se pode editar
  const canEdit = (status: string) => {
    return status === "DRAFT" || status === "PENDING";
  };

  // Verifica ações disponíveis
  const getAvailableActions = (status: string) => {
    const actions: { label: string; value: string; color: string }[] = [];
    switch (status) {
      case "DRAFT":
        actions.push({
          label: "Pendente",
          value: "PENDING",
          color: "text-yellow-600",
        });
        break;
      case "PENDING":
        actions.push({ label: "Pago", value: "PAID", color: "text-blue-600" });
        actions.push({
          label: "Cancelar",
          value: "CANCELLED",
          color: "text-red-600",
        });
        break;
      case "PAID":
        actions.push({
          label: "Recebido",
          value: "RECEIVED",
          color: "text-green-600",
        });
        actions.push({
          label: "Cancelar",
          value: "CANCELLED",
          color: "text-red-600",
        });
        break;
    }
    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">
            Gestão de compras de insumos e materiais
          </p>
          {!canManage && (
            <p className="text-xs text-muted-foreground mt-1">
              🔒 Visualização apenas. Contate um administrador para editar.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar compra..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64 pl-8"
            />
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Compra
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhuma compra encontrada.</p>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar primeira compra
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((purchase: any) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {purchase.code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {purchase.supplier?.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {purchase.itemCount || 0} item(ns)
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(purchase.total)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(purchase.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={purchase.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 flex items-center gap-1.5"
                        title="Ver detalhes"
                        onClick={() => handleOpenDetails(purchase.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-medium hidden sm:inline">
                          Detalhes
                        </span>
                      </Button>

                      {canManage && canEdit(purchase.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5"
                          title="Editar"
                          onClick={() => openEdit(purchase)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">
                            Editar
                          </span>
                        </Button>
                      )}

                      {canManage &&
                        getAvailableActions(purchase.status).length > 0 && (
                          <Select
                            className="h-9 w-32 text-xs"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(purchase.id, e.target.value);
                              }
                            }}
                            options={[
                              { value: "", label: "Ações..." },
                              ...getAvailableActions(purchase.status).map(
                                (a) => ({
                                  value: a.value,
                                  label: a.label,
                                }),
                              ),
                            ]}
                          />
                        )}

                      {canManage && purchase.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir"
                          onClick={() => handleDelete(purchase)}
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
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Página {page} de {Math.max(totalPages, 1)} • {data?.total || 0}{" "}
            registros
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de criação/edição */}
      {canManage && (
        <Dialog open={open} onOpenChange={(v) => !v && resetForm()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPurchase ? "Editar Compra" : "Nova Compra"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <SearchSelect
                    value={supplierId}
                    onChange={(value) => setValue("supplierId", value)}
                    options={supplierOptions}
                    placeholder="Buscar fornecedor..."
                    isLoading={suppliersLoading}
                  />
                  {errors.supplierId && (
                    <p className="text-xs text-destructive">
                      {errors.supplierId.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onChange={(e) => setValue("status", e.target.value as any)}
                    options={STATUS_OPTIONS}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("discount", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" {...register("dueDate")} />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    {...register("notes")}
                    placeholder="Observações sobre a compra..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Itens da Compra *</Label>
                <PurchaseItemsEditor
                  items={items}
                  onChange={(newItems) => setValue("items", newItems)}
                />
                {errors.items && (
                  <p className="text-xs text-destructive">
                    {errors.items.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMut.isPending ||
                    updateMut.isPending ||
                    !supplierId ||
                    items.length === 0 ||
                    items.some((i) => !i.stockItemId || i.quantity <= 0)
                  }
                >
                  {createMut.isPending || updateMut.isPending
                    ? "Salvando..."
                    : editingPurchase
                      ? "Atualizar Compra"
                      : "Criar Compra"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <PurchaseDetailsDialog
        purchaseId={selectedPurchaseId}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedPurchaseId(null);
        }}
      />
    </div>
  );
}
