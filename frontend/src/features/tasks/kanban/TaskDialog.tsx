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
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: defaultStatus as any,
      priority: "NORMAL",
    },
  });

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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={undefined}
                onValueChange={(v) => setValue("status", v as any)}
                defaultValue={task?.status || defaultStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">A Fazer</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Progresso</SelectItem>
                  <SelectItem value="DONE">Concluída</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                onValueChange={(v) => setValue("priority", v as any)}
                defaultValue={task?.priority || "NORMAL"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select
                onValueChange={(v) => setValue("projectId", v)}
                defaultValue={task?.projectId || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                onValueChange={(v) => setValue("assigneeId", v)}
                defaultValue={task?.assigneeId || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {(users || []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
