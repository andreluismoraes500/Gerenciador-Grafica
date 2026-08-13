import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select"; // ✅ Apenas Select
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Task } from "./TaskCard";

const taskSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  projectId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type TaskForm = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  defaultStatus?: string;
  onSubmit: (data: TaskForm, taskId?: string) => void;
  isPending?: boolean;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = "TODO",
  onSubmit,
  isPending,
}: TaskDialogProps) {
  const { data: projects } = useQuery({
    queryKey: ["projects-select"],
    queryFn: () => api.get("/projects?limit=100").then((r) => r.data.data),
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
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: defaultStatus as any,
      priority: "NORMAL",
    },
  });

  // Observa os valores dos selects controlados
  const statusValue = watch("status");
  const priorityValue = watch("priority");
  const projectValue = watch("projectId");
  const assigneeValue = watch("assigneeId");

  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title,
          description: task.description || "",
          status: task.status as any,
          priority: task.priority as any,
          projectId: task.projectId || "",
          assigneeId: task.assigneeId || "",
          dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        });
      } else {
        reset({
          title: "",
          description: "",
          status: defaultStatus as any,
          priority: "NORMAL",
          projectId: "",
          assigneeId: "",
          dueDate: "",
        });
      }
    }
  }, [open, task, defaultStatus, reset]);

  const handleFormSubmit = (data: TaskForm) => {
    onSubmit(
      {
        ...data,
        projectId: data.projectId || null,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      },
      task?.id,
    );
  };

  const STATUS_OPTIONS = [
    { value: "TODO", label: "A Fazer" },
    { value: "IN_PROGRESS", label: "Em Progresso" },
    { value: "DONE", label: "Concluída" },
    { value: "CANCELLED", label: "Cancelada" },
  ];

  const PRIORITY_OPTIONS = [
    { value: "LOW", label: "Baixa" },
    { value: "NORMAL", label: "Normal" },
    { value: "HIGH", label: "Alta" },
    { value: "URGENT", label: "Urgente" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              {...register("title")}
              placeholder="Ex: Criar arte do banner"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              {...register("description")}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusValue || ""}
                onChange={(e) => setValue("status", e.target.value as any)}
                options={STATUS_OPTIONS}
                placeholder="Selecione..."
              />
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={priorityValue || "NORMAL"}
                onChange={(e) => setValue("priority", e.target.value as any)}
                options={PRIORITY_OPTIONS}
                placeholder="Selecione..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Projeto */}
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select
                value={projectValue || ""}
                onChange={(e) => setValue("projectId", e.target.value)}
                options={[
                  { value: "", label: "— Nenhum —" },
                  ...(projects || []).map((p: any) => ({
                    value: p.id,
                    label: p.title,
                  })),
                ]}
                placeholder="Nenhum"
              />
            </div>

            {/* Responsável */}
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={assigneeValue || ""}
                onChange={(e) => setValue("assigneeId", e.target.value)}
                options={[
                  { value: "", label: "— Nenhum —" },
                  ...(users || []).map((u: any) => ({
                    value: u.id,
                    label: u.name,
                  })),
                ]}
                placeholder="Nenhum"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prazo</Label>
            <Input type="date" {...register("dueDate")} />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : task ? "Atualizar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
