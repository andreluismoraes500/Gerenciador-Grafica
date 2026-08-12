import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Mail, Phone } from "lucide-react";
import api from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";

const clientSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  document: z.string().min(11, "CPF/CNPJ obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  notes: z.string().optional(),
  address: z
    .object({
      street: z.string().min(2),
      number: z.string().min(1),
      district: z.string().min(2),
      city: z.string().min(2),
      state: z.string().min(2),
      zipCode: z.string().min(8),
    })
    .optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

export function ClientsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () =>
      api.get(`/clients?limit=50&search=${search}`).then((r) => r.data.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: ClientForm) => api.post("/clients", data),
    onSuccess: () => {
      toast.success("Cliente cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      handleClose();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao cadastrar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      toast.success("Cliente removido");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const onSubmit = (data: ClientForm) => {
    if (editingId) {
      // Atualização (implementar se necessário)
    } else {
      createMutation.mutate(data);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    reset();
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Cliente",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.document}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Contato",
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{row.original.email}</span>
          </div>
          {row.original.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{row.original.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "address",
      header: "Endereço",
      cell: ({ row }) => {
        const a = row.original.address;
        return a ? (
          <span className="text-sm text-muted-foreground">
            {a.city}/{a.state}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {(row.original.tags || []).slice(0, 2).map((t: string) => (
            <span
              key={t}
              className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
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
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Excluir este cliente?"))
                deleteMutation.mutate(row.original.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie sua base de clientes.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-80"
            />
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => !open && handleClose()}
          >
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar" : "Novo"} Cliente
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input {...register("name")} />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>CPF/CNPJ *</Label>
                    <Input {...register("document")} />
                    {errors.document && (
                      <p className="text-xs text-destructive">
                        {errors.document.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" {...register("email")} />
                    {errors.email && (
                      <p className="text-xs text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input {...register("phone")} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Endereço</h3>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8 space-y-2">
                      <Label>Rua</Label>
                      <Input {...register("address.street")} />
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label>Nº</Label>
                      <Input {...register("address.number")} />
                    </div>
                    <div className="col-span-6 space-y-2">
                      <Label>Bairro</Label>
                      <Input {...register("address.district")} />
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label>Cidade</Label>
                      <Input {...register("address.city")} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>UF</Label>
                      <Input {...register("address.state")} maxLength={2} />
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label>CEP</Label>
                      <Input {...register("address.zipCode")} />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
    </div>
  );
}
