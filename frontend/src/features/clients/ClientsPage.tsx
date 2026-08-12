import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { z } from "zod";

const config: CrudConfig = {
  title: "Clientes",
  subtitle: "Sua base de clientes e contatos",
  endpoint: "/clients",
  columns: [
    {
      key: "name",
      header: "Cliente",
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.document}</p>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (r) => <span className="text-muted-foreground">{r.email}</span>,
    },
    {
      key: "phone",
      header: "Telefone",
      render: (r) => r.phone || r.mobile || "—",
    },
    {
      key: "address.city",
      header: "Cidade",
      render: (r) => (r.address ? `${r.address.city}/${r.address.state}` : "—"),
    },
  ],
  fields: [
    { name: "name", label: "Nome completo", required: true, span: 2 },
    {
      name: "document",
      label: "CPF/CNPJ",
      required: true,
      zod: z.string().min(11, "Mínimo 11 dígitos").max(14, "Máximo 14 dígitos"),
    },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Telefone" },
    { name: "mobile", label: "Celular" },
    { name: "notes", label: "Observações", type: "textarea", span: 2 },
  ],
};
export function ClientsPage() {
  return <CrudPage config={config} />;
}
