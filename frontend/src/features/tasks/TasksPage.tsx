import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { KanbanColumn } from "./kanban/KanbanColumn";
import { TaskCard, Task } from "./kanban/TaskCard";
import { TaskDialog } from "./kanban/TaskDialog";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import api from "@/api/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const config: CrudConfig = {
  title: "Tarefas",
  subtitle: "Gerenciar tarefas",
  endpoint: "/tasks",
  columns: [],
  fields: [],
};

const TASK_COLUMNS = [
  { id: "TODO", title: "A Fazer", color: "bg-gray-400" },
  { id: "IN_PROGRESS", title: "Em Progresso", color: "bg-blue-500" },
  { id: "DONE", title: "Concluída", color: "bg-green-500" },
  { id: "CANCELLED", title: "Cancelada", color: "bg-red-500" },
];

export function TasksPage() {
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const qc = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks-kanban"],
    queryFn: () => api.get("/tasks?limit=500").then((r) => r.data.data),
    enabled: view === "kanban",
  });

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("TODO");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks-kanban"] });
      const previous = qc.getQueryData(["tasks-kanban"]);
      qc.setQueryData(["tasks-kanban"], (old: any) =>
        old?.map((t: any) => (t.id === id ? { ...t, status } : t)),
      );
      return { previous };
    },
    onError: (err, vars, ctx) => {
      qc.setQueryData(["tasks-kanban"], ctx?.previous);
      toast.error("Erro ao mover tarefa");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks-kanban"] }),
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks?.find((t: any) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks?.find((t: any) => t.id === taskId);
    if (task && task.status !== newStatus)
      updateStatusMut.mutate({ id: taskId, status: newStatus });
  };

  if (view === "list") {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setView("kanban")}>
            <LayoutGrid className="mr-2 h-4 w-4" /> Kanban
          </Button>
        </div>
        <CrudPage config={config} />
      </div>
    );
  }

  if (isLoading) return <Skeleton className="h-[600px]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Organize o trabalho da equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setView("list")}>
            <List className="mr-2 h-4 w-4" /> Lista
          </Button>
          <Button variant="outline" disabled>
            <LayoutGrid className="mr-2 h-4 w-4" /> Kanban
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              tasks={tasks?.filter((t: any) => t.status === col.id) || []}
              onAddTask={(s) => {
                setDefaultStatus(s);
                setEditingTask(null);
                setDialogOpen(true);
              }}
              onEditTask={(t) => {
                setEditingTask(t);
                setDialogOpen(true);
              }}
              onDeleteTask={(id) => {
                if (confirm("Excluir?"))
                  api
                    .delete(`/tasks/${id}`)
                    .then(() =>
                      qc.invalidateQueries({ queryKey: ["tasks-kanban"] }),
                    );
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
        onSubmit={(data, id) => {
          const req = id
            ? api.put(`/tasks/${id}`, data)
            : api.post("/tasks", data);
          req.then(() => {
            toast.success("Salvo!");
            qc.invalidateQueries({ queryKey: ["tasks-kanban"] });
            setDialogOpen(false);
          });
        }}
      />
    </div>
  );
}
