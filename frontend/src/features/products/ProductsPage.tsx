import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  sku: z.string().min(3, "SKU obrigatório"),
  costPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
});

type ProductForm = z.infer<typeof productSchema>;

export function ProductsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products?limit=100").then((res) => res.data.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) => api.post("/products", data),
    onSuccess: () => {
      toast.success("Produto criado!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
      reset();
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success("Produto removido");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const onSubmit = (data: ProductForm) => {
    if (editingId) {
      // Lógica de update (api.put)
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "name", header: "Nome" },
    {
      accessorKey: "costPrice",
      header: "Custo",
      cell: (info) => formatCurrency(info.getValue() as number),
    },
    {
      accessorKey: "salePrice",
      header: "Venda",
      cell: (info) => formatCurrency(info.getValue() as number),
    },
    { accessorKey: "stock", header: "Estoque" },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingId(row.original.id);
              setIsDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de itens e estoque.
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Produto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input {...register("name")} />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input {...register("sku")} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Custo</Label>
                  <Input type="number" step="0.01" {...register("costPrice")} />
                </div>
                <div className="space-y-2">
                  <Label>Venda</Label>
                  <Input type="number" step="0.01" {...register("salePrice")} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input type="number" {...register("stock")} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
    </div>
  );
}
