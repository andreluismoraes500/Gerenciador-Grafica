import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const config: CrudConfig = {
  title: "Projetos",
  subtitle: "Artes, aprovações e andamento da produção",
  endpoint: "/projects",
  columns: [
    {
      key: "title",
      header: "Projeto",
      render: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="text-xs text-muted-foreground">{r.client?.name}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "priority",
      header: "Prioridade",
      render: (r) => <PriorityBadge priority={r.priority} />,
    },
    {
      key: "dueDate",
      header: "Prazo",
      render: (r) => (r.dueDate ? formatDate(r.dueDate) : "—"),
    },
  ],
  fields: [
    {
      name: "title",
      label: "Título",
      required: true,
      span: 2,
      placeholder: "Ex.: Cartão de visitas — Empresa X",
    },
    {
      name: "clientId",
      label: "Cliente",
      type: "select",
      optionsUrl: "/clients",
      required: true,
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
    { name: "dueDate", label: "Prazo de entrega", type: "date" },
    { name: "description", label: "Descrição", type: "textarea", span: 2 },
  ],
};
export function ProjectsPage() {
  return <CrudPage config={config} />;
}
