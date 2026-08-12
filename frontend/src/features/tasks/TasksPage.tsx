import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, ListTodo, Clock, CheckCircle2, XCircle } from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanColumn } from "./kanban/KanbanColumn";
import { TaskCard, Task } from "./kanban/TaskCard";
import { TaskDialog } from "./kanban/TaskDialog";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS = [
  {
    id: "TODO",
    title: "A Fazer",
    color: "bg-slate-400",
    icon: <ListTodo className="h-4 w-4" />,
  },
  {
    id: "IN_PROGRESS",
    title: "Em Progresso",
    color: "bg-blue-500",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    id: "DONE",
    title: "Concluídas",
    color: "bg-green-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    id: "CANCELLED",
    title: "Canceladas",
    color: "bg-red-400",
    icon: <XCircle className="h-4 w-4" />,
  },
];

export function TasksPage() {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("TODO");
  const [search, setSearch] = useState("");

  // Queries
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks?limit=200").then((r) => r.data.data),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/tasks", data),
    onSuccess: () => {
      toast.success("Tarefa criada!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao criar tarefa"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/tasks/${id}`, data),
    onSuccess: () => {
      toast.success("Tarefa atualizada!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
      setEditingTask(null);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao atualizar"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const col = COLUMNS.find((c) => c.id === variables.status);
      toast.success(`Tarefa movida para "${col?.title}"`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      toast.success("Tarefa excluída");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const filtered = (tasksData || []).filter((t: Task) =>
      t.title.toLowerCase().includes(search.toLowerCase()),
    );

    const grouped: Record<string, Task[]> = {};
    COLUMNS.forEach((col) => {
      grouped[col.id] = filtered.filter((t: Task) => t.status === col.id);
    });
    return grouped;
  }, [tasksData, search]);

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = (tasksData || []).find((t: Task) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find which column the task was dropped into
    const sourceColumn = COLUMNS.find((col) =>
      tasksByColumn[col.id]?.some((t) => t.id === taskId),
    );

    // Check if dropped over a column header
    const targetColumn =
      COLUMNS.find((col) => col.id === overId) ||
      COLUMNS.find((col) =>
        tasksByColumn[col.id]?.some((t) => t.id === overId),
      );

    if (targetColumn && sourceColumn && targetColumn.id !== sourceColumn.id) {
      statusMutation.mutate({ id: taskId, status: targetColumn.id });
    }
  };

  const handleAddTask = (status: string) => {
    setDefaultStatus(status);
    setEditingTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultStatus(task.status);
    setDialogOpen(true);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Excluir esta tarefa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (data: any, taskId?: string) => {
    if (taskId) {
      updateMutation.mutate({ id: taskId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie tarefas com drag-and-drop entre colunas.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => handleAddTask("TODO")}>
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4 flex-1">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex-1 min-w-[300px]">
              <Skeleton className="h-8 mb-2" />
              <Skeleton className="h-40 mb-2" />
              <Skeleton className="h-40" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={tasksByColumn[column.id] || []}
                color={column.color}
                icon={column.icon}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rotate-3 opacity-90">
                <TaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        defaultStatus={defaultStatus}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
