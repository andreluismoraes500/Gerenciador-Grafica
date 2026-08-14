import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  FileUp,
  CheckCircle,
  Circle,
  Clock,
  Send,
  Play,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectFilesManager } from "./ProjectFilesManager";
import { cn, formatDate } from "@/lib/utils";

interface ProjectDetailsDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (status: string) => void;
  onComplete?: (projectId: string) => void;
  isDesigner?: boolean;
  isAdmin?: boolean;
}

const STATUS_FLOW = [
  { id: "ANALYSIS", label: "Análise", icon: Circle },
  { id: "CREATING", label: "Criação", icon: Clock },
  { id: "AWAITING_APPROVAL", label: "Aguardando Aprovação", icon: Send },
  { id: "PRODUCTION", label: "Produção", icon: Play },
  { id: "COMPLETED", label: "Concluído", icon: CheckCircle },
];

export function ProjectDetailsDialog({
  projectId,
  open,
  onOpenChange,
  onStatusChange,
  onComplete,
  isDesigner = false,
  isAdmin = false,
}: ProjectDetailsDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");

  const {
    data: project,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
    enabled: !!projectId && open,
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/projects/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Status atualizado!");
      refetch();
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
      refetch();
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao concluir projeto.");
    },
  });

  const handleStatusChange = (status: string) => {
    if (status === "COMPLETED") {
      if (project?.files?.some((f: any) => f.isFinal)) {
        completeProjectMut.mutate(projectId!);
      } else {
        toast.warning("Marque uma arte final antes de concluir o projeto.");
        setActiveTab("files");
      }
      return;
    }
    updateStatusMut.mutate({ id: projectId!, status });
  };

  if (!projectId) return null;

  const canManage = isDesigner || isAdmin;
  const currentStatusIndex = STATUS_FLOW.findIndex(
    (s) => s.id === project?.status,
  );
  const isCompleted = project?.status === "COMPLETED";
  const isCancelled = project?.status === "CANCELLED";
  const hasFinalArt = project?.files?.some((f: any) => f.isFinal) || false;
  const fileCount = project?.files?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              {isLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <>
                  <span className="text-lg font-semibold">
                    {project?.title}
                  </span>
                  {project?.status && <StatusBadge status={project.status} />}
                  {project?.priority && (
                    <PriorityBadge priority={project.priority} />
                  )}
                </>
              )}
            </div>
            <DialogClose className="rounded-sm opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="files" className="relative">
                Arquivos
                {fileCount > 0 && (
                  <span className="ml-1 text-xs bg-primary/10 px-1.5 py-0.5 rounded-full">
                    {fileCount}
                  </span>
                )}
                {hasFinalArt && (
                  <CheckCircle className="ml-1 h-3 w-3 text-green-500" />
                )}
              </TabsTrigger>
              {canManage && <TabsTrigger value="actions">Ações</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : (
                <div className="space-y-6 py-2">
                  {/* Informações do projeto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-medium">
                        {project?.client?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Designer</p>
                      <p className="font-medium">
                        {project?.designer?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Código</p>
                      <p className="font-mono text-sm">{project?.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Prazo</p>
                      <p className="font-medium">
                        {project?.dueDate ? formatDate(project.dueDate) : "—"}
                      </p>
                    </div>
                  </div>

                  {project?.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="text-sm mt-1">{project.description}</p>
                    </div>
                  )}

                  {/* Resumo de arquivos */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Arquivos
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{fileCount} arquivo(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          className={cn(
                            "h-4 w-4",
                            hasFinalArt
                              ? "text-green-500"
                              : "text-muted-foreground",
                          )}
                        />
                        <span className="text-sm">
                          {hasFinalArt
                            ? "Arte final definida ✅"
                            : "Sem arte final ⚠️"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progresso */}
                  {!isCompleted && !isCancelled && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Progresso
                      </p>
                      <div className="flex items-center gap-1">
                        {STATUS_FLOW.map((status, index) => {
                          const isActive = index <= currentStatusIndex;
                          const Icon = status.icon;
                          return (
                            <div key={status.id} className="flex items-center">
                              <div
                                className={cn(
                                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs",
                                  isActive
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted text-muted-foreground",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "h-4 w-4",
                                    !isActive && "opacity-50",
                                  )}
                                />
                              </div>
                              {index < STATUS_FLOW.length - 1 && (
                                <div
                                  className={cn(
                                    "w-6 h-0.5",
                                    index < currentStatusIndex
                                      ? "bg-primary"
                                      : "bg-muted",
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        {STATUS_FLOW.map((status) => (
                          <span
                            key={status.id}
                            className="text-[10px] text-muted-foreground"
                          >
                            {status.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comentários */}
                  {project?.comments?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Comentários
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {project.comments.map((comment: any) => (
                          <div
                            key={comment.id}
                            className="bg-muted/30 p-2 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">
                                {comment.user?.name || "Usuário"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="flex-1 overflow-y-auto">
              {projectId && (
                <ProjectFilesManager
                  projectId={projectId}
                  projectTitle={project?.title || ""}
                  isDesigner={isDesigner}
                />
              )}
            </TabsContent>

            {canManage && (
              <TabsContent value="actions" className="space-y-4 py-2">
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        Status do Projeto
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_FLOW.map((status) => {
                          const isActive = status.id === project?.status;
                          const isDisabled =
                            isCompleted ||
                            isCancelled ||
                            (status.id === "COMPLETED" && !hasFinalArt) ||
                            (status.id === "PRODUCTION" && !hasFinalArt);

                          return (
                            <Button
                              key={status.id}
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              disabled={isDisabled}
                              onClick={() => handleStatusChange(status.id)}
                              className={
                                status.id === "COMPLETED"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : ""
                              }
                            >
                              {isActive && (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              )}
                              {status.label}
                            </Button>
                          );
                        })}
                      </div>
                      {!hasFinalArt && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ Marque uma arte final na aba "Arquivos" para
                          concluir ou enviar para produção.
                        </p>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-2">
                        Ações Rápidas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("files")}
                        >
                          <FileUp className="mr-2 h-4 w-4" />
                          Upload de Arquivos
                        </Button>

                        {project?.status === "CREATING" && (
                          <Button
                            variant="default"
                            className="border-blue-500 bg-blue-500 hover:bg-blue-600"
                            onClick={() =>
                              handleStatusChange("AWAITING_APPROVAL")
                            }
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Enviar para Aprovação
                          </Button>
                        )}

                        {project?.status !== "COMPLETED" &&
                          project?.status !== "CANCELLED" && (
                            <Button
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                if (hasFinalArt) {
                                  completeProjectMut.mutate(projectId);
                                } else {
                                  toast.warning(
                                    "Marque uma arte final primeiro.",
                                  );
                                  setActiveTab("files");
                                }
                              }}
                              disabled={
                                !hasFinalArt || completeProjectMut.isPending
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {completeProjectMut.isPending
                                ? "Concluindo..."
                                : "Dar Baixa / Concluir"}
                            </Button>
                          )}

                        {project?.status !== "CANCELLED" && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (
                                confirm(
                                  "Tem certeza que deseja cancelar este projeto?",
                                )
                              ) {
                                handleStatusChange("CANCELLED");
                              }
                            }}
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Cancelar Projeto
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Informações de Estoque */}
                    {project?.order && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Informações do Pedido
                        </h4>
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm">
                            Pedido:{" "}
                            <span className="font-mono">
                              {project.order.code}
                            </span>
                          </p>
                          <p className="text-sm">
                            Status:{" "}
                            <StatusBadge status={project.order.status} />
                          </p>
                          <p className="text-sm">
                            Total: R$ {project.order.total.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Ao concluir o projeto, os insumos do estoque serão
                            consumidos automaticamente.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
