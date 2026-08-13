import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import api from "@/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

const PROJECT_COLUMNS = [
  { id: "ANALYSIS", title: "Em Análise", color: "bg-yellow-500" },
  { id: "CREATING", title: "Em Criação", color: "bg-blue-500" },
  {
    id: "AWAITING_APPROVAL",
    title: "Aguardando Cliente",
    color: "bg-orange-500",
  },
  { id: "PRODUCTION", title: "Em Produção", color: "bg-purple-500" },
  { id: "COMPLETED", title: "Concluído", color: "bg-green-500" },
];

function ProjectCard({ project }: { project: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-card border border-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all",
        isDragging && "opacity-50 z-50",
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium leading-tight pr-2">
          {project.title}
        </h4>
        <PriorityBadge priority={project.priority} />
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {project.client?.name}
      </p>
      <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-2 pt-2 border-t">
        <span>
          Prazo: {project.dueDate ? formatDate(project.dueDate) : "—"}
        </span>
        <StatusBadge status={project.status} />
      </div>
    </div>
  );
}

function ProjectColumn({ id, title, color, projects }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      className={cn(
        "flex flex-col min-w-[300px] max-w-[340px] flex-1 rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-2 p-3 pb-2 border-b">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded-full">
          {projects.length}
        </span>
      </div>
      <SortableContext
        id={id}
        items={projects.map((p: any) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex-1 space-y-2 p-2 overflow-y-auto min-h-[120px] max-h-[calc(100vh-250px)]"
        >
          {projects.map((p: any) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function ProjectBoard() {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects-kanban"],
    queryFn: () => api.get("/projects?limit=500").then((r) => r.data.data),
  });

  const [activeProject, setActiveProject] = useState<any>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/projects/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["projects-kanban"] });
      const previous = qc.getQueryData(["projects-kanban"]);
      qc.setQueryData(["projects-kanban"], (old: any) =>
        old?.map((p: any) => (p.id === id ? { ...p, status } : p)),
      );
      return { previous };
    },
    onError: (err, vars, ctx) => {
      qc.setQueryData(["projects-kanban"], ctx?.previous);
      toast.error("Erro ao mover projeto");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects-kanban"] }),
  });

  const handleDragStart = (event: DragStartEvent) =>
    setActiveProject(projects?.find((p: any) => p.id === event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    if (!over) return;
    const projId = active.id as string;
    const newStatus = over.id as string;
    const proj = projects?.find((p: any) => p.id === projId);
    if (proj && proj.status !== newStatus)
      updateStatusMut.mutate({ id: projId, status: newStatus });
  };

  if (isLoading) return <Skeleton className="h-[600px]" />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PROJECT_COLUMNS.map((col) => (
          <ProjectColumn
            key={col.id}
            {...col}
            projects={projects?.filter((p: any) => p.status === col.id) || []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProject ? (
          <div className="bg-card border border-primary rounded-lg p-3 shadow-xl rotate-3 opacity-90">
            <h4 className="text-sm font-medium">{activeProject.title}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
