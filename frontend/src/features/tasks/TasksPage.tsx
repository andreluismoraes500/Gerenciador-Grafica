import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const config: CrudConfig = {
  title: "Tarefas",
  subtitle: "Organize o trabalho da equipe",
  endpoint: "/tasks",
  defaultValues: { status: "TODO", priority: "NORMAL" },
  columns: [
    {
      key: "title",
      header: "Tarefa",
      render: (r) => <p className="font-medium">{r.title}</p>,
    },
    {
      key: "project.title",
      header: "Projeto",
      render: (r) => r.project?.title ?? "—",
    },
    {
      key: "assignee.name",
      header: "Responsável",
      render: (r) => r.assignee?.name ?? "—",
    },
    {
      key: "priority",
      header: "Prioridade",
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "dueDate",
      header: "Prazo",
      render: (r) => (r.dueDate ? formatDate(r.dueDate) : "—"),
    },
  ],
  fields: [
    { name: "title", label: "Título", required: true, span: 2 },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "TODO", label: "A Fazer" },
        { value: "IN_PROGRESS", label: "Em Progresso" },
        { value: "DONE", label: "Concluída" },
        { value: "CANCELLED", label: "Cancelada" },
      ],
    },
    {
      name: "priority",
      label: "Prioridade",
      type: "select",
      options: [
        { value: "LOW", label: "Baixa" },
        { value: "NORMAL", label: "Normal" },
        { value: "HIGH", label: "Alta" },
        { value: "URGENT", label: "Urgente" },
      ],
    },
    {
      name: "projectId",
      label: "Projeto",
      type: "select",
      optionsUrl: "/projects",
    },
    {
      name: "assigneeId",
      label: "Responsável",
      type: "select",
      optionsUrl: "/settings/users",
    },
    { name: "dueDate", label: "Prazo", type: "date" },
    { name: "description", label: "Descrição", type: "textarea", span: 2 },
  ],
};
export function TasksPage() {
  return <CrudPage config={config} />;
}
