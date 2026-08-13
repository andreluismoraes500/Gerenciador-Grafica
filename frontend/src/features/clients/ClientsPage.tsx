import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatCpfCnpj } from "@/lib/utils";

const clientSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  document: z
    .string()
    .min(11, "CPF/CNPJ: mínimo 11 dígitos")
    .max(18, "Máximo 18 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

const emptyForm: ClientForm = {
  name: "",
  document: "",
  email: "",
  phone: "",
  mobile: "",
  notes: "",
};

export function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["clients", search, page],
    queryFn: () =>
      api
        .get("/clients", {
          params: { page, limit: 10, search: search || undefined },
        })
        .then((r) => r.data),
    placeholderData: (p) => p,
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });
  const save = useMutation({
    mutationFn: async (payload: ClientForm) => {
      if (editing)
        return (await api.put(`/clients/${editing.id}`, payload)).data;
      return (await api.post("/clients", payload)).data;
    },
    onSuccess: () => {
      toast.success(
        editing
          ? "Cliente atualizado com sucesso!"
          : "Cliente criado com sucesso!",
      );
      qc.invalidateQueries({ queryKey: ["clients"] });
      close();
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const serverError = err?.response?.data?.error;
      let msg = "Erro ao salvar cliente.";
      if (status === 409)
        msg = serverError || "CPF/CNPJ ou Email já cadastrado.";
      else if (status === 400)
        msg = serverError || "Dados inválidos. Verifique os campos.";
      else if (!err?.response)
        msg = "Backend fora do ar. Verifique o terminal do backend.";
      toast.error(msg);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      toast.success("Cliente excluído.");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao excluir."),
  });
  const close = () => {
    setOpen(false);
    setEditing(null);
    reset(emptyForm);
  };
  const openNew = () => {
    setEditing(null);
    reset(emptyForm);
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing(row);
    reset({
      name: row.name,
      document: formatCpfCnpj(row.document),
      email: row.email || "",
      phone: row.phone || "",
      mobile: row.mobile || "",
      notes: row.notes || "",
    });
    setOpen(true);
  };
  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Sua base de clientes e contatos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64 pl-8"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhum cliente encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCpfCnpj(row.document)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.phone || row.mobile || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.address
                      ? `${row.address.city}/${row.address.state}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Excluir este cliente?"))
                            del.mutate(row.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Página {page} de {Math.max(totalPages, 1)} • {data?.total ?? 0}{" "}
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
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Editar: ${editing.name}` : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Nome completo *</Label>
                <Input {...register("name")} placeholder="Ex: João da Silva" />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ *</Label>
                <Input
                  {...register("document", {
                    onChange: (e) => {
                      const formatted = formatCpfCnpj(e.target.value);
                      setValue("document", formatted, { shouldValidate: true });
                    },
                  })}
                  placeholder="000.000.000-00"
                  maxLength={18}
                />
                {errors.document && (
                  <p className="text-xs text-destructive">
                    {errors.document.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="email@exemplo.com (opcional)"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input {...register("phone")} placeholder="(00) 0000-0000" />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input {...register("mobile")} placeholder="(00) 90000-0000" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea
                  {...register("notes")}
                  placeholder="Notas internas sobre o cliente..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending
                  ? "Salvando..."
                  : editing
                    ? "Atualizar"
                    : "Criar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
