import { CrudPage, CrudConfig } from "@/components/crud/CrudPage";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const config: CrudConfig = {
  title: "Produtos",
  subtitle: "Catálogo, preços e estoque da gráfica",
  endpoint: "/products",
  columns: [
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono text-xs">{r.sku}</span>,
    },
    {
      key: "name",
      header: "Produto",
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.category?.name ?? "Sem categoria"}
          </p>
        </div>
      ),
    },
    {
      key: "costPrice",
      header: "Custo",
      render: (r) => (
        <span className="text-muted-foreground">
          {formatCurrency(r.costPrice)}
        </span>
      ),
    },
    {
      key: "salePrice",
      header: "Venda",
      render: (r) => (
        <span className="font-semibold">{formatCurrency(r.salePrice)}</span>
      ),
    },
    {
      key: "stock",
      header: "Estoque",
      render: (r) => (
        <Badge variant={r.stock <= r.minStock ? "danger" : "success"}>
          {r.stock} un
        </Badge>
      ),
    },
  ],
  fields: [
    {
      name: "name",
      label: "Nome",
      required: true,
      span: 2,
      placeholder: "Ex.: Camiseta Algodão Premium",
    },
    { name: "sku", label: "SKU", required: true, placeholder: "CAM001" },
    {
      name: "categoryId",
      label: "Categoria",
      type: "select",
      optionsUrl: "/products/categories",
    },
    {
      name: "costPrice",
      label: "Preço de Custo (R$)",
      type: "number",
      step: "0.01",
      min: 0,
      required: true,
    },
    {
      name: "salePrice",
      label: "Preço de Venda (R$)",
      type: "number",
      step: "0.01",
      min: 0,
      required: true,
    },
    { name: "stock", label: "Estoque", type: "number", min: 0 },
    { name: "minStock", label: "Estoque Mínimo", type: "number", min: 0 },
    { name: "description", label: "Descrição", type: "textarea", span: 2 },
  ],
};
export function ProductsPage() {
  return <CrudPage config={config} />;
}
