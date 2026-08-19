// frontend/src/features/kits/KitsPage.tsx

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Inbox,
  Eye,
  Pencil,
  Trash2,
  Package,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// Schema de validação
const kitItemSchema = z.object({
  productId: z.string().min(1, "Selecione um produto"),
  productName: z.string().optional(),
  quantity: z.number().min(1, "Quantidade deve ser maior que zero"),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

const kitSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  price: z.number().min(0, "Preço não pode ser negativo").optional(),
  isActive: z.boolean().default(true),
  items: z.array(kitItemSchema).min(1, "Adicione pelo menos um produto"),
});

type KitForm = z.infer<typeof kitSchema>;
type KitItem = z.infer<typeof kitItemSchema>;

// Componente de detalhes do kit
function KitDetailsDialog({
  kitId,
  open,
  onClose,
}: {
  kitId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: kit, isLoading } = useQuery({
    queryKey: ["kit-details", kitId],
    queryFn: () => api.get(`/kits/${kitId}`).then((r) => r.data),
    enabled: !!kitId && open,
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["kit-availability", kitId],
    queryFn: () => api.get(`/kits/${kitId}/availability`).then((r) => r.data),
    enabled: !!kitId && open,
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Kit</span>
            {kit && (
              <span className="text-sm font-mono text-muted-foreground">
                {kit.isActive ? "Ativo" : "Inativo"}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : kit ? (
          <div className="space-y-6">
            {/* Informações gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="text-sm font-medium">{kit.name}</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Preço</p>
                <p className="text-lg font-bold">{formatCurrency(kit.price)}</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Produtos</p>
                <p className="text-sm font-medium">{kit.productCount} itens</p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={kit.isActive ? "PAID" : "CANCELLED"} />
              </div>
            </div>

            {kit.description && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm mt-1">{kit.description}</p>
              </div>
            )}

            {/* Itens do Kit */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos do Kit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kit.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
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
                          {formatCurrency(item.product?.salePrice || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(
                            item.product?.salePrice * item.quantity || 0,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4">
                  <div className="text-sm font-semibold">
                    Total do Kit:{" "}
                    <span className="text-primary">
                      {formatCurrency(kit.price)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disponibilidade de Estoque */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Disponibilidade de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availabilityLoading ? (
                  <Skeleton className="h-32" />
                ) : availability ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      {availability.isAvailable ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {availability.isAvailable
                          ? "Kit disponível em estoque"
                          : "Alguns produtos estão com estoque insuficiente"}
                      </span>
                    </div>
                    {availability.items?.map((item: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          item.isAvailable
                            ? "bg-green-50 dark:bg-green-950/20"
                            : "bg-red-50 dark:bg-red-950/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.productName}</span>
                          <span className="text-xs text-muted-foreground">
                            Necessário: {item.needed} | Disponível:{" "}
                            {item.available}
                          </span>
                        </div>
                        {item.isAvailable ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível verificar a disponibilidade
                  </p>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Kit não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Componente de seleção de produto
function ProductSearchSelect({
  value,
  onChange,
  onProductSelect,
  placeholder = "Buscar produto...",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (product: any) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-select", debouncedSearch],
    queryFn: () =>
      api
        .get("/kits/available-products", {
          params: {
            search: debouncedSearch || undefined,
          },
        })
        .then((r) => r.data || []),
    enabled: true,
  });

  const options: SearchSelectOption[] = useMemo(() => {
    if (!products) return [];
    return products.map((p: any) => ({
      value: p.id,
      label: p.name,
      subLabel: `SKU: ${p.sku} • Estoque: ${p.stock} • R$ ${p.salePrice.toFixed(2)}`,
    }));
  }, [products]);

  const handleSelect = (val: string) => {
    onChange(val);
    if (onProductSelect && val) {
      const product = products?.find((p: any) => p.id === val);
      if (product) onProductSelect(product);
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
function KitItemsEditor({
  items,
  onChange,
}: {
  items: KitItem[];
  onChange: (items: KitItem[]) => void;
}) {
  const setItem = (idx: number, patch: Partial<KitItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (idx: number, product: any) => {
    const quantity = items[idx]?.quantity || 1;
    setItem(idx, {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.salePrice,
      totalPrice: quantity * product.salePrice,
    });
  };

  const handleQuantityChange = (idx: number, quantity: number) => {
    const item = items[idx];
    if (quantity < 1) return;
    setItem(idx, {
      quantity,
      totalPrice: quantity * (item.unitPrice || 0),
    });
  };

  const totalPrice = items.reduce((s, i) => s + i.totalPrice, 0);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">Nenhum produto adicionado</p>
          <p className="text-xs">Clique em "Adicionar produto" para começar</p>
        </div>
      ) : (
        items.map((it, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-center gap-2 p-3 bg-muted/30 rounded-lg"
          >
            <div className="col-span-6">
              <ProductSearchSelect
                value={it.productId}
                onChange={(val) => setItem(idx, { productId: val })}
                onProductSelect={(product) => handleProductSelect(idx, product)}
                placeholder="Buscar produto por nome ou SKU..."
              />
            </div>

            <div className="col-span-2">
              <Input
                type="number"
                min={1}
                step={1}
                value={it.quantity || ""}
                placeholder="Qtd"
                className="h-10"
                onChange={(e) =>
                  handleQuantityChange(idx, Number(e.target.value) || 1)
                }
              />
            </div>

            <div className="col-span-2 text-sm text-muted-foreground text-center">
              {formatCurrency(it.unitPrice || 0)}
            </div>

            <div className="col-span-1 text-sm font-semibold text-right">
              {formatCurrency(it.totalPrice)}
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
          Adicionar produto
        </Button>
        <div className="text-sm font-semibold">
          Total:{" "}
          <span className="text-primary">{formatCurrency(totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}

export function KitsPage() {
  const qc = useQueryClient();
  const { permissions } = usePermissions();
  const canManage = permissions.canManageProducts;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);

  // Buscar kits
  const { data, isLoading } = useQuery({
    queryKey: ["kits", search, page],
    queryFn: () =>
      api
        .get("/kits", {
          params: { page, limit: 10, search: search || undefined },
        })
        .then((r) => r.data),
    placeholderData: (p) => p,
  });

  // Buscar produtos disponíveis
  const { data: availableProducts } = useQuery({
    queryKey: ["available-products"],
    queryFn: () => api.get("/kits/available-products").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<KitForm>({
    resolver: zodResolver(kitSchema),
    defaultValues: {
      items: [],
      isActive: true,
    },
  });

  const items = watch("items") || [];
  const isActive = watch("isActive");
  const kitPrice = watch("price");

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: KitForm) => api.post("/kits", data),
    onSuccess: () => {
      toast.success("Kit criado com sucesso! 🎉");
      qc.invalidateQueries({ queryKey: ["kits"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao criar kit.";
      toast.error(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KitForm> }) =>
      api.put(`/kits/${id}`, data),
    onSuccess: () => {
      toast.success("Kit atualizado!");
      qc.invalidateQueries({ queryKey: ["kits"] });
      resetForm();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao atualizar kit.";
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/kits/${id}`),
    onSuccess: (response) => {
      if (response.data?.message) {
        toast.info(response.data.message);
      } else {
        toast.success("Kit excluído!");
      }
      qc.invalidateQueries({ queryKey: ["kits"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "Erro ao excluir kit.";
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditingKit(null);
    reset({
      name: "",
      description: "",
      price: 0,
      isActive: true,
      items: [],
    });
  };

  const openCreate = () => {
    if (!canManage) {
      toast.error("Você não tem permissão para criar kits.");
      return;
    }
    setEditingKit(null);
    reset({
      name: "",
      description: "",
      price: 0,
      isActive: true,
      items: [],
    });
    setOpen(true);
  };

  const openEdit = (kit: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para editar kits.");
      return;
    }
    setEditingKit(kit);
    reset({
      name: kit.name,
      description: kit.description || "",
      price: kit.price || 0,
      isActive: kit.isActive,
      items:
        kit.items?.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || "",
          quantity: item.quantity,
          unitPrice: item.product?.salePrice || 0,
          totalPrice: (item.product?.salePrice || 0) * item.quantity,
        })) || [],
    });
    setOpen(true);
  };

  const handleDelete = (kit: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para excluir kits.");
      return;
    }
    if (kit.isActive && !confirm(`Desativar o kit "${kit.name}"?`)) {
      return;
    }
    deleteMut.mutate(kit.id);
  };

  const handleOpenDetails = (id: string) => {
    setSelectedKitId(id);
    setDetailsOpen(true);
  };

  const onSubmit = (data: KitForm) => {
    if (editingKit) {
      updateMut.mutate({ id: editingKit.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const rows = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Calcula o preço total dos itens para exibição
  const totalItemsPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kits</h1>
          <p className="text-muted-foreground">
            Produtos compostos e combos especiais
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
              placeholder="Buscar kits..."
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
              Novo Kit
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhum kit encontrado.</p>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar primeiro kit
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((kit: any) => (
                <TableRow key={kit.id}>
                  <TableCell className="font-medium">{kit.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {kit.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kit.productCount || 0} item(ns)
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(kit.price)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={kit.isActive ? "PAID" : "CANCELLED"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 flex items-center gap-1.5"
                        title="Ver detalhes"
                        onClick={() => handleOpenDetails(kit.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-medium hidden sm:inline">
                          Detalhes
                        </span>
                      </Button>

                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 flex items-center gap-1.5"
                            title="Editar"
                            onClick={() => openEdit(kit)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="text-xs font-medium hidden sm:inline">
                              Editar
                            </span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={kit.isActive ? "Desativar" : "Excluir"}
                            onClick={() => handleDelete(kit)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-xs font-medium hidden sm:inline">
                              {kit.isActive ? "Desativar" : "Excluir"}
                            </span>
                          </Button>
                        </>
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
                {editingKit ? "Editar Kit" : "Novo Kit"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do Kit *</Label>
                    <Input
                      {...register("name")}
                      placeholder="Ex: Kit Camiseta + Caneca"
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={isActive ? "true" : "false"}
                      onChange={(e) =>
                        setValue("isActive", e.target.value === "true")
                      }
                      options={[
                        { value: "true", label: "Ativo" },
                        { value: "false", label: "Inativo" },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço do Kit</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...register("price", { valueAsNumber: true })}
                        placeholder="Deixe em branco para calcular automaticamente"
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ou {formatCurrency(totalItemsPrice)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {totalItemsPrice > 0 && kitPrice !== totalItemsPrice
                        ? `⚠️ Preço diferente da soma dos itens (${formatCurrency(totalItemsPrice)})`
                        : "💡 Deixe em branco para usar a soma dos produtos"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Total de Itens</Label>
                    <div className="h-10 flex items-center text-sm font-medium">
                      {items.length} produto(s) •{" "}
                      {items.reduce((sum, i) => sum + i.quantity, 0)} unidades
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    {...register("description")}
                    placeholder="Descrição do kit para o catálogo..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Produtos do Kit *</Label>
                <KitItemsEditor
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
                    items.length === 0 ||
                    items.some((i) => !i.productId || i.quantity < 1)
                  }
                >
                  {createMut.isPending || updateMut.isPending
                    ? "Salvando..."
                    : editingKit
                      ? "Atualizar Kit"
                      : "Criar Kit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <KitDetailsDialog
        kitId={selectedKitId}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedKitId(null);
        }}
      />
    </div>
  );
}
