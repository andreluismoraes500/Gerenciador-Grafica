// frontend/src/features/tasks/kanban/TaskCard.tsx

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  GripVertical,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const priorityConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  LOW: {
    label: "Baixa",
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  NORMAL: {
    label: "Normal",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  HIGH: {
    label: "Alta",
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/40",
  },
  URGENT: {
    label: "Urgente",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/40",
  },
};

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  projectId?: string | null;
  project?: { id: string; title: string } | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; avatar?: string } | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete?: (id: string) => void;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onComplete,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  const priority = priorityConfig[task.priority] || priorityConfig.NORMAL;
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative bg-card border border-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/30 transition-all duration-200",
        isDragging && "opacity-50 shadow-xl ring-2 ring-primary/50 z-50",
      )}
    >
      {/* Grip visual */}
      <div className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide",
            priority.bg,
            priority.color,
          )}
        >
          {priority.label}
        </span>
        {isOverdue && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
            Atrasada
          </span>
        )}
      </div>

      <h4 className="text-sm font-medium leading-tight mb-1 pr-6">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}
      {task.project && (
        <span className="inline-block px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full mb-2">
          {task.project.title}
        </span>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center gap-1" title={task.assignee.name}>
              {task.assignee.avatar ? (
                <img
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className="h-5 w-5 rounded-full"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px]",
                isOverdue
                  ? "text-red-500 font-medium"
                  : "text-muted-foreground",
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onComplete && task.status !== "DONE" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 flex items-center gap-1"
              title="Dar baixa (concluir)"
              onClick={() => onComplete(task.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] hidden group-hover:inline">
                Concluir
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 flex items-center gap-1"
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="text-[10px] hidden group-hover:inline">
              Editar
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 flex items-center gap-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-[10px] hidden group-hover:inline">
              Excluir
            </span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
