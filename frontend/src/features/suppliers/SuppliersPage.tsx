import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";

const config: CrudConfig = {
  title: "Fornecedores",
  subtitle: "Parceiros e compras de insumos",
  endpoint: "/suppliers",
  columns: [
    {
      key: "name",
      header: "Fornecedor",
      render: (r) => <p className="font-medium">{r.name}</p>,
    },
    { key: "document", header: "CNPJ", render: (r) => r.document || "—" },
    { key: "email", header: "Email", render: (r) => r.email || "—" },
    { key: "phone", header: "Telefone", render: (r) => r.phone || "—" },
    { key: "contact", header: "Contato", render: (r) => r.contact || "—" },
  ],
  fields: [
    { name: "name", label: "Nome", required: true, span: 2 },
    { name: "document", label: "CNPJ" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone" },
    { name: "contact", label: "Pessoa de contato" },
    { name: "address", label: "Endereço", span: 2 },
    { name: "notes", label: "Observações", type: "textarea", span: 2 },
  ],
};
export function SuppliersPage() {
  return <CrudPage config={config} />;
}
