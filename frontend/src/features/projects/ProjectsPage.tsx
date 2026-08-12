import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Upload, Eye, FileText, Download } from "lucide-react";
import api from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/utils";

const projectSchema = z.object({
  title: z.string().min(3, "Título obrigatório"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Cliente obrigatório"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  dueDate: z.string().optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

export function ProjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects?limit=50").then((r) => r.data.data),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () => api.get("/clients?limit=200").then((r) => r.data.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { priority: "NORMAL" },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectForm) => api.post("/projects", data),
    onSuccess: () => {
      toast.success("Projeto criado!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsDialogOpen(false);
      reset();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao criar"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/projects/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, files }: { id: string; files: FileList }) => {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      return api.post(`/projects/${id}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Arquivos enviados!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const onSubmit = (data: ProjectForm) => createMutation.mutate(data);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.code.slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Projeto",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.client?.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => {
        const colors: Record<string, string> = {
          LOW: "text-gray-500",
          NORMAL: "text-blue-500",
          HIGH: "text-orange-500",
          URGENT: "text-red-500 font-bold",
        };
        return (
          <span
            className={`text-xs font-medium ${colors[row.original.priority]}`}
          >
            {row.original.priority}
          </span>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Prazo",
      cell: ({ row }) =>
        row.original.dueDate ? (
          formatDate(row.original.dueDate)
        ) : (
          <span className="text-muted-foreground">—</span>
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
            onClick={() => setSelectedProject(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie projetos, arquivos e aprovações.
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(o) => {
            setIsDialogOpen(o);
            if (!o) reset();
          }}
        >
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Projeto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  {...register("title")}
                  placeholder="Ex: Cartão de Visitas - Empresa X"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input {...register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select onValueChange={(v) => setValue("clientId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(clients || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    defaultValue="NORMAL"
                    onValueChange={(v: any) => setValue("priority", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" {...register("dueDate")} />
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
                  {createMutation.isPending ? "Criando..." : "Criar Projeto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={projects || []}
        isLoading={isLoading}
      />

      {/* Modal de Detalhes do Projeto */}
      {selectedProject && (
        <Dialog
          open={!!selectedProject}
          onOpenChange={() => setSelectedProject(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedProject.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Cliente
                  </Label>
                  <p className="font-medium">{selectedProject.client?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <div className="mt-1">
                    <Select
                      value={selectedProject.status}
                      onValueChange={(s) => {
                        statusMutation.mutate({
                          id: selectedProject.id,
                          status: s,
                        });
                        setSelectedProject({ ...selectedProject, status: s });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANALYSIS">Em Análise</SelectItem>
                        <SelectItem value="CREATING">Em Criação</SelectItem>
                        <SelectItem value="AWAITING_APPROVAL">
                          Aguardando Aprovação
                        </SelectItem>
                        <SelectItem value="PRODUCTION">Em Produção</SelectItem>
                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo</Label>
                  <p className="font-medium">
                    {selectedProject.dueDate
                      ? formatDate(selectedProject.dueDate)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Upload de Arquivos */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Arquivos do Projeto</Label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          uploadMutation.mutate({
                            id: selectedProject.id,
                            files: e.target.files,
                          });
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-3 w-3 mr-2" /> Enviar Arquivos
                      </span>
                    </Button>
                  </label>
                </div>

                <div className="space-y-2">
                  {(selectedProject.files || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                      Nenhum arquivo enviado ainda
                    </p>
                  ) : (
                    selectedProject.files.map((f: any) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {f.type} • {(f.size / 1024).toFixed(1)} KB • v
                              {f.version}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`${api.defaults.baseURL.replace("/api", "")}${f.url}`}
                            download
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
