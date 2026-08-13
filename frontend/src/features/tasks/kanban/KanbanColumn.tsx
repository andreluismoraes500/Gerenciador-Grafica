import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskCard, Task } from "./TaskCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
  icon?: React.ReactNode;
  onAddTask: (status: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask?: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  color,
  icon,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  function handleCompleteTask(taskId: string): void {
    onCompleteTask?.(taskId);
  }

  return (
    <div
      className={cn(
        "flex flex-col min-w-[300px] max-w-[340px] flex-1 rounded-xl border border-border bg-muted/30 transition-colors",
        isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/20",
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded-full text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onAddTask(id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Tasks */}
      <SortableContext
        id={id}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex-1 space-y-2 p-2 pt-1 overflow-y-auto min-h-[120px] max-h-[calc(100vh-220px)]"
        >
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
              Arraste tarefas aqui
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onComplete={onCompleteTask}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
