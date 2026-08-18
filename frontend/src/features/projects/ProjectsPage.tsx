import { useState, useMemo } from "react";
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
  FileUp,
  CheckCircle,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFilesManager } from "@/features/projects/ProjectFilesManager";
import { ProjectDetailsDialog } from "@/features/projects/ProjectDetailsDialog";
import { formatDate } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

const projectSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Selecione um cliente"),
  designerId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  dueDate: z.string().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

const defaultValues: ProjectForm = {
  title: "",
  description: "",
  clientId: "",
  designerId: "",
  priority: "NORMAL",
  dueDate: "",
};

export function ProjectsPage() {
  const qc = useQueryClient();
  const { permissions } = usePermissions();
  const canManage = permissions.canManageProjects;

  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects", search],
    queryFn: () =>
      api
        .get("/projects", {
          params: {
            limit: 50,
            search: search || undefined,
          },
        })
        .then((r) => r.data),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients-select", clientSearch],
    queryFn: () =>
      api
        .get("/clients", {
          params: {
            limit: 50,
            search: clientSearch || undefined,
          },
        })
        .then((r) => r.data.data || []),
  });

  const { data: users } = useQuery({
    queryKey: ["users-select"],
    queryFn: () => api.get("/settings/users").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });

  const clientIdValue = watch("clientId");

  const createProjectMut = useMutation({
    mutationFn: async (data: ProjectForm) => {
      if (!canManage) {
        throw new Error("Você não tem permissão para criar projetos.");
      }
      const payload: any = {
        title: data.title,
        description: data.description || undefined,
        clientId: data.clientId,
        priority: data.priority,
      };

      if (data.designerId && data.designerId.trim() !== "") {
        payload.designerId = data.designerId;
      }

      if (data.dueDate) {
        payload.dueDate = new Date(data.dueDate + "T12:00:00").toISOString();
      }

      const response = await api.post("/projects", payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Projeto criado com sucesso! 🎉");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setCreateDialogOpen(false);
      reset(defaultValues);

      setSelectedProjectId(data.id);
      setFilesDialogOpen(true);
    },
    onError: (error: any) => {
      let message = "Erro ao criar projeto.";
      if (error?.response?.data?.details) {
        const details = error.response.data.details;
        message = details
          .map((d: any) => `${d.field}: ${d.message}`)
          .join(", ");
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    },
  });

  const updateProjectMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectForm }) => {
      if (!canManage) {
        throw new Error("Você não tem permissão para editar projetos.");
      }
      const payload: any = {
        title: data.title,
        description: data.description || undefined,
        clientId: data.clientId,
        priority: data.priority,
      };

      if (data.designerId && data.designerId.trim() !== "") {
        payload.designerId = data.designerId;
      } else {
        payload.designerId = null;
      }

      if (data.dueDate) {
        payload.dueDate = new Date(data.dueDate + "T12:00:00").toISOString();
      } else {
        payload.dueDate = null;
      }

      const response = await api.put(`/projects/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Projeto atualizado com sucesso! ✅");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditDialogOpen(false);
      setEditingProject(null);
      reset(defaultValues);
    },
    onError: (error: any) => {
      let message = "Erro ao atualizar projeto.";
      if (error?.response?.data?.error) {
        message = error.response.data.error;
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    },
  });

  const deleteProjectMut = useMutation({
    mutationFn: (id: string) => {
      if (!canManage) {
        throw new Error("Você não tem permissão para excluir projetos.");
      }
      return api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      toast.success("Projeto excluído com sucesso! 🗑️");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: any) => {
      let message = "Erro ao excluir projeto.";
      if (error?.response?.data?.error) {
        message = error.response.data.error;
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      if (!canManage) {
        throw new Error("Você não tem permissão para alterar status.");
      }
      return api.patch(`/projects/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao atualizar status.");
    },
  });

  const completeProjectMut = useMutation({
    mutationFn: (id: string) => {
      if (!canManage) {
        throw new Error("Você não tem permissão para concluir projetos.");
      }
      return api.post(`/projects/${id}/complete`);
    },
    onSuccess: () => {
      toast.success("✅ Projeto concluído com sucesso!");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDetailsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao concluir projeto.");
    },
  });

  const handleOpenFiles = (projectId: string) => {
    if (!canManage) {
      toast.error("Você não tem permissão para gerenciar arquivos.");
      return;
    }
    setSelectedProjectId(projectId);
    setFilesDialogOpen(true);
  };

  const handleOpenDetails = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDetailsOpen(true);
  };

  const handleEdit = (project: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para editar projetos.");
      return;
    }
    setEditingProject(project);
    reset({
      title: project.title,
      description: project.description || "",
      clientId: project.clientId,
      designerId: project.designerId || "",
      priority: project.priority || "NORMAL",
      dueDate: project.dueDate ? project.dueDate.split("T")[0] : "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (project: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para excluir projetos.");
      return;
    }
    if (project.status === "COMPLETED") {
      toast.warning("Projetos concluídos não podem ser excluídos.");
      return;
    }
    if (
      confirm(
        `Tem certeza que deseja excluir o projeto "${project.title}"?\n\nTodos os arquivos serão removidos permanentemente.`,
      )
    ) {
      deleteProjectMut.mutate(project.id);
    }
  };

  const handleComplete = (projectId: string) => {
    if (!canManage) {
      toast.error("Você não tem permissão para concluir projetos.");
      return;
    }
    if (
      confirm(
        "Tem certeza que deseja dar baixa neste projeto? Isso irá consumir os insumos do estoque.",
      )
    ) {
      completeProjectMut.mutate(projectId);
    }
  };

  const handleSendToApproval = (projectId: string, currentStatus: string) => {
    if (!canManage) {
      toast.error("Você não tem permissão para alterar status.");
      return;
    }
    if (currentStatus === "CREATING") {
      updateStatusMut.mutate({ id: projectId, status: "AWAITING_APPROVAL" });
    } else if (currentStatus === "AWAITING_APPROVAL") {
      updateStatusMut.mutate({ id: projectId, status: "PRODUCTION" });
    } else {
      toast.info(
        "Este projeto não está em um estado que pode ser enviado para aprovação.",
      );
    }
  };

  const handleCancelProject = (project: any) => {
    if (!canManage) {
      toast.error("Você não tem permissão para cancelar projetos.");
      return;
    }
    if (
      confirm(`Tem certeza que deseja cancelar o projeto "${project.title}"?`)
    ) {
      updateStatusMut.mutate({ id: project.id, status: "CANCELLED" });
    }
  };

  const onSubmit = (data: ProjectForm) => {
    createProjectMut.mutate(data);
  };

  const onEditSubmit = (data: ProjectForm) => {
    if (editingProject) {
      updateProjectMut.mutate({ id: editingProject.id, data });
    }
  };

  const projects = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie artes, aprovações e produção
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
              placeholder="Buscar projetos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
          {canManage && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Arquivos</TableHead>
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
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhum projeto encontrado.</p>
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar primeiro projeto
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project: any) => {
                const fileCount = project.files?.length || 0;
                const hasFinalArt =
                  project.files?.some((f: any) => f.isFinal) || false;
                const isCompleted = project.status === "COMPLETED";
                const isCancelled = project.status === "CANCELLED";

                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {project.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{project.client?.name || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={project.priority} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.dueDate ? formatDate(project.dueDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
                        </span>
                        {hasFinalArt && (
                          <div title="Arte final marcada">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {/* Botão Arquivos - apenas quem pode gerenciar */}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 flex items-center gap-1.5"
                            onClick={() => handleOpenFiles(project.id)}
                            title="Gerenciar arquivos"
                          >
                            <FileUp className="h-4 w-4" />
                            <span className="text-xs font-medium hidden sm:inline">
                              Arquivos
                            </span>
                          </Button>
                        )}

                        {/* Botão Detalhes - todos podem ver */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 flex items-center gap-1.5"
                          onClick={() => handleOpenDetails(project.id)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">
                            Detalhes
                          </span>
                        </Button>

                        {/* Menu de opções - apenas quem pode gerenciar */}
                        {canManage && !isCompleted && !isCancelled && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 flex items-center gap-1.5"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="text-xs font-medium hidden sm:inline">
                                  Mais
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(project)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar Projeto
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenFiles(project.id)}
                              >
                                <FileUp className="mr-2 h-4 w-4" />
                                Upload de Arquivos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSendToApproval(
                                    project.id,
                                    project.status,
                                  )
                                }
                                disabled={
                                  project.status !== "CREATING" &&
                                  project.status !== "AWAITING_APPROVAL"
                                }
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {project.status === "CREATING"
                                  ? "Enviar para Aprovação"
                                  : "Aprovar e Iniciar Produção"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleComplete(project.id)}
                                disabled={
                                  !hasFinalArt || completeProjectMut.isPending
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {hasFinalArt
                                  ? "Dar Baixa / Concluir"
                                  : "⚠️ Marque a Arte Final primeiro"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(project)}
                                className="text-destructive"
                                disabled={deleteProjectMut.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleteProjectMut.isPending
                                  ? "Excluindo..."
                                  : "Excluir Projeto"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancelProject(project)}
                                className="text-destructive"
                              >
                                Cancelar Projeto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Criação de Projeto - só aparece se tiver permissão */}
      {canManage && (
        <>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Projeto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Projeto *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Cartão de visitas - Empresa X"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientId">Cliente *</Label>
                    <SearchSelect
                      value={clientIdValue}
                      onChange={(value) => setValue("clientId", value)}
                      options={
                        clients?.map((c: any) => ({
                          value: c.id,
                          label: c.name,
                          subLabel: c.document
                            ? `CPF/CNPJ: ${c.document}`
                            : c.email || "",
                        })) || []
                      }
                      placeholder="Buscar cliente por nome ou documento..."
                      isLoading={clientsLoading}
                    />
                    {errors.clientId && (
                      <p className="text-xs text-destructive">
                        {errors.clientId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designerId">Designer Responsável</Label>
                    <Select
                      id="designerId"
                      placeholder="Selecione um designer..."
                      options={[
                        { value: "", label: "— Não atribuir —" },
                        ...(users
                          ?.filter(
                            (u: any) =>
                              u.role === "DESIGNER" || u.role === "ADMIN",
                          )
                          .map((u: any) => ({
                            value: u.id,
                            label: u.name,
                          })) || []),
                      ]}
                      {...register("designerId")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Prioridade</Label>
                      <Select
                        id="priority"
                        options={[
                          { value: "LOW", label: "Baixa" },
                          { value: "NORMAL", label: "Normal" },
                          { value: "HIGH", label: "Alta" },
                          { value: "URGENT", label: "Urgente" },
                        ]}
                        {...register("priority")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Prazo de Entrega</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        {...register("dueDate")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Detalhes do projeto, requisitos, observações..."
                      rows={3}
                      {...register("description")}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createProjectMut.isPending}>
                    {createProjectMut.isPending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
                        Criando...
                      </>
                    ) : (
                      "Criar Projeto"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog de EDIÇÃO de Projeto */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Projeto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Título do Projeto *</Label>
                    <Input
                      id="edit-title"
                      placeholder="Ex: Cartão de visitas - Empresa X"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-clientId">Cliente *</Label>
                    <SearchSelect
                      value={clientIdValue}
                      onChange={(value) => setValue("clientId", value)}
                      options={
                        clients?.map((c: any) => ({
                          value: c.id,
                          label: c.name,
                          subLabel: c.document
                            ? `CPF/CNPJ: ${c.document}`
                            : c.email || "",
                        })) || []
                      }
                      placeholder="Buscar cliente por nome ou documento..."
                      isLoading={clientsLoading}
                    />
                    {errors.clientId && (
                      <p className="text-xs text-destructive">
                        {errors.clientId.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-designerId">
                      Designer Responsável
                    </Label>
                    <Select
                      id="edit-designerId"
                      placeholder="Selecione um designer..."
                      options={[
                        { value: "", label: "— Não atribuir —" },
                        ...(users
                          ?.filter(
                            (u: any) =>
                              u.role === "DESIGNER" || u.role === "ADMIN",
                          )
                          .map((u: any) => ({
                            value: u.id,
                            label: u.name,
                          })) || []),
                      ]}
                      {...register("designerId")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-priority">Prioridade</Label>
                      <Select
                        id="edit-priority"
                        options={[
                          { value: "LOW", label: "Baixa" },
                          { value: "NORMAL", label: "Normal" },
                          { value: "HIGH", label: "Alta" },
                          { value: "URGENT", label: "Urgente" },
                        ]}
                        {...register("priority")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-dueDate">Prazo de Entrega</Label>
                      <Input
                        id="edit-dueDate"
                        type="date"
                        {...register("dueDate")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Descrição</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Detalhes do projeto, requisitos, observações..."
                      rows={3}
                      {...register("description")}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setEditingProject(null);
                      reset(defaultValues);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateProjectMut.isPending}>
                    {updateProjectMut.isPending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
                        Atualizando...
                      </>
                    ) : (
                      "Atualizar Projeto"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Arquivos do Projeto</DialogTitle>
          </DialogHeader>
          {selectedProjectId && (
            <ProjectFilesManager
              projectId={selectedProjectId}
              projectTitle={
                projects.find((p: any) => p.id === selectedProjectId)?.title ||
                ""
              }
              isDesigner={canManage}
            />
          )}
        </DialogContent>
      </Dialog>

      <ProjectDetailsDialog
        projectId={selectedProjectId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusChange={(status) => {
          if (selectedProjectId && canManage) {
            updateStatusMut.mutate({ id: selectedProjectId, status });
          }
        }}
        onComplete={handleComplete}
        isDesigner={canManage}
        isAdmin={permissions.canManageSettings}
      />
    </div>
  );
}
