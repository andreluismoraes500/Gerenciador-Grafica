import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Building2, Users, Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  client?: { id: string } | null;
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "DESIGNER", label: "Designer" },
  { value: "ATTENDANT", label: "Atendente" },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({
    queryKey: ["company"],
    queryFn: () => api.get("/settings/company").then((r) => r.data),
  });
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/settings/users").then((r) => r.data as TeamUser[]),
  });

  const { register, handleSubmit, reset } = useForm<any>();
  useEffect(() => {
    if (company) reset(company);
  }, [company, reset]);

  const saveMut = useMutation({
    mutationFn: (data: any) => api.put("/settings/company", data),
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  // ---- Gestão de usuários ----
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUserForm,
  } = useForm<any>();

  function openCreateUser() {
    setEditingUser(null);
    resetUserForm({ name: "", email: "", password: "", role: "ATTENDANT" });
    setUserDialogOpen(true);
  }

  function openEditUser(u: TeamUser) {
    setEditingUser(u);
    resetUserForm({ name: u.name, email: u.email, password: "", role: u.role });
    setUserDialogOpen(true);
  }

  const saveUserMut = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (!payload.password) delete payload.password; // não sobrescreve senha em branco
      return editingUser
        ? api.put(`/settings/users/${editingUser.id}`, payload)
        : api.post("/settings/users", payload);
    },
    onSuccess: () => {
      toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
      qc.invalidateQueries({ queryKey: ["users"] });
      setUserDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erro ao salvar usuário.");
    },
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/users/${id}`),
    onSuccess: (res) => {
      const data = res.data as { deleted?: boolean; deactivated?: boolean; reason?: string };
      if (data?.deactivated) {
        toast.success(data.reason || "Usuário desativado (possui histórico vinculado).");
      } else {
        toast.success("Usuário excluído!");
      }
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Não foi possível excluir este usuário.");
    },
  });

  function handleDeleteUser(u: TeamUser) {
    if (u.client) {
      toast.error(
        "Este usuário é o login de um cliente. Para removê-lo, exclua o cliente na tela de Clientes.",
      );
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${u.name}"?`)) return;
    deleteUserMut.mutate(u.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Dados da empresa e equipe</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <form
                onSubmit={handleSubmit((v) => saveMut.mutate(v))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input {...register("name")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input {...register("cnpj")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input {...register("phone")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" {...register("email")} />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input {...register("address")} />
                </div>
                <Button type="submit" disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Usuários da Equipe
            </CardTitle>
            <Button size="sm" onClick={openCreateUser}>
              <Plus className="mr-1 h-4 w-4" />
              Novo usuário
            </Button>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}
                        {u.client && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Cliente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === "ADMIN" ? "default" : "info"}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "success" : "outline"}>
                          {u.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditUser(u)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(u)}
                          disabled={deleteUserMut.isPending}
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(users ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum usuário cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmitUser((v) => saveUserMut.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input {...registerUser("name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" {...registerUser("email", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Perfil *</Label>
              <Select options={ROLE_OPTIONS} {...registerUser("role", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>
                {editingUser ? "Nova senha (deixe em branco para manter)" : "Senha *"}
              </Label>
              <Input
                type="password"
                {...registerUser("password", { required: !editingUser })}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saveUserMut.isPending}>
                {saveUserMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
