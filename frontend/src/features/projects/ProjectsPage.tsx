import { useState } from "react";
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
  Upload,
  CheckCircle,
  FileUp,
  MoreHorizontal,
  X,
} from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFilesManager } from "@/components/projects/ProjectFilesManager";
import { ProjectDetailsDialog } from "@/components/projects/ProjectDetailsDialog";
import { formatDate } from "@/lib/utils";

// Schema de validação para o formulário
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
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Queries para dados
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

  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () => api.get("/clients?limit=100").then((r) => r.data.data),
  });

  const { data: users } = useQuery({
    queryKey: ["users-select"],
    queryFn: () => api.get("/settings/users").then((r) => r.data),
  });

  // Formulário
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

  // Mutations
  const createProjectMut = useMutation({
    mutationFn: async (data: ProjectForm) => {
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
      }
      toast.error(message);
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/projects/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao atualizar status.");
    },
  });

  const completeProjectMut = useMutation({
    mutationFn: (id: string) => api.post(`/projects/${id}/complete`),
    onSuccess: () => {
      toast.success("✅ Projeto concluído com sucesso!");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDetailsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao concluir projeto.");
    },
  });

  // Handlers
  const handleOpenFiles = (projectId: string) => {
    setSelectedProjectId(projectId);
    setFilesDialogOpen(true);
  };

  const handleOpenDetails = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDetailsOpen(true);
  };

  const handleComplete = (projectId: string) => {
    if (
      confirm(
        "Tem certeza que deseja dar baixa neste projeto? Isso irá consumir os insumos do estoque.",
      )
    ) {
      completeProjectMut.mutate(projectId);
    }
  };

  const onSubmit = (data: ProjectForm) => {
    createProjectMut.mutate(data);
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
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Tabela de Projetos */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeiro projeto
                    </Button>
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
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenFiles(project.id)}
                          title="Gerenciar arquivos"
                        >
                          <FileUp className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDetails(project.id)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!isCompleted && !isCancelled && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenFiles(project.id)}
                                >
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Upload de Arquivos
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (project.status === "CREATING") {
                                      updateStatusMut.mutate({
                                        id: project.id,
                                        status: "AWAITING_APPROVAL",
                                      });
                                    } else if (
                                      project.status === "AWAITING_APPROVAL"
                                    ) {
                                      updateStatusMut.mutate({
                                        id: project.id,
                                        status: "PRODUCTION",
                                      });
                                    } else {
                                      toast.info(
                                        "Este projeto não está em um estado que pode ser enviado para aprovação.",
                                      );
                                    }
                                  }}
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
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                if (
                                  confirm(
                                    "Tem certeza que deseja cancelar este projeto?",
                                  )
                                ) {
                                  updateStatusMut.mutate({
                                    id: project.id,
                                    status: "CANCELLED",
                                  });
                                }
                              }}
                              disabled={isCompleted || isCancelled}
                              className="text-destructive"
                            >
                              Cancelar Projeto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Criação de Projeto */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              {/* Título */}
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

              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select
                  id="clientId"
                  placeholder="Selecione um cliente..."
                  options={
                    clients?.map((c: any) => ({
                      value: c.id,
                      label: c.name,
                    })) || []
                  }
                  {...register("clientId")}
                />
                {errors.clientId && (
                  <p className="text-xs text-destructive">
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              {/* Designer */}
              <div className="space-y-2">
                <Label htmlFor="designerId">Designer Responsável</Label>
                <Select
                  id="designerId"
                  placeholder="Selecione um designer..."
                  options={[
                    { value: "", label: "— Não atribuir —" },
                    ...(users
                      ?.filter(
                        (u: any) => u.role === "DESIGNER" || u.role === "ADMIN",
                      )
                      .map((u: any) => ({
                        value: u.id,
                        label: u.name,
                      })) || []),
                  ]}
                  {...register("designerId")}
                />
              </div>

              {/* Prioridade e Prazo */}
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
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                </div>
              </div>

              {/* Descrição */}
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

      {/* Dialog de Gerenciamento de Arquivos */}
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
              isDesigner={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Projeto */}
      <ProjectDetailsDialog
        projectId={selectedProjectId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusChange={(status) => {
          if (selectedProjectId) {
            updateStatusMut.mutate({ id: selectedProjectId, status });
          }
        }}
        onComplete={handleComplete}
        isDesigner={true}
        isAdmin={true}
      />
    </div>
  );
}
