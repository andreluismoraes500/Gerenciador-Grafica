import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { Badge } from "@/components/ui/badge";

const config: CrudConfig = {
  title: "Insumos e Estoque",
  subtitle: "Papel, tinta, chapas e materiais de produção",
  endpoint: "/stock-items",
  columns: [
    {
      key: "name",
      header: "Insumo",
      render: (r) => <p className="font-medium">{r.name}</p>,
    },
    { key: "category", header: "Categoria", render: (r) => r.category || "—" },
    {
      key: "quantity",
      header: "Estoque",
      render: (r) => (
        <Badge variant={r.quantity <= r.minStock ? "danger" : "success"}>
          {r.quantity} {r.unit}
        </Badge>
      ),
    },
    {
      key: "minStock",
      header: "Mínimo",
      render: (r) => `${r.minStock} ${r.unit}`,
    },
    {
      key: "unitCost",
      header: "Custo Unit.",
      render: (r) => `R$ ${r.unitCost.toFixed(2)}`,
    },
  ],
  fields: [
    { name: "name", label: "Nome do Insumo", required: true, span: 2 },
    { name: "category", label: "Categoria", placeholder: "Ex: Papel, Tinta" },
    {
      name: "unit",
      label: "Unidade",
      required: true,
      placeholder: "Ex: kg, folhas",
    },
    {
      name: "quantity",
      label: "Quantidade Atual",
      type: "number",
      step: "0.01",
      min: 0,
    },
    {
      name: "minStock",
      label: "Estoque Mínimo",
      type: "number",
      step: "0.01",
      min: 0,
    },
    {
      name: "unitCost",
      label: "Custo Unitário (R$)",
      type: "number",
      step: "0.01",
      min: 0,
    },
  ],
  defaultValues: { quantity: 0, minStock: 0, unitCost: 0 },
};

export function StockItemsPage() {
  return <CrudPage config={config} />;
}
