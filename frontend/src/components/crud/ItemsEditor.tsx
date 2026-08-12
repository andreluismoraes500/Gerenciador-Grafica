import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export interface ItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function ItemsEditor({
  items,
  onChange,
  products,
}: {
  items: ItemRow[];
  onChange: (i: ItemRow[]) => void;
  products: any[];
}) {
  const set = (idx: number, patch: Partial<ItemRow>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="grid grid-cols-12 items-center gap-2">
          <div className="col-span-6">
            <Select
              value={it.productId}
              placeholder="Produto..."
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.sku})`,
              }))}
              onChange={(e) => {
                const prod = products.find((p) => p.id === e.target.value);
                set(idx, {
                  productId: e.target.value,
                  unitPrice: prod?.salePrice ?? 0,
                });
              }}
            />
          </div>
          <Input
            className="col-span-2"
            type="number"
            min={1}
            value={it.quantity || ""}
            placeholder="Qtd"
            onChange={(e) => set(idx, { quantity: Number(e.target.value) })}
          />
          <div className="col-span-3 text-sm font-medium">
            {formatCurrency(it.quantity * it.unitPrice)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="col-span-1 h-8 w-8 text-destructive"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...items, { productId: "", quantity: 1, unitPrice: 0 }])
          }
        >
          <Plus className="mr-1 h-3 w-3" />
          Adicionar item
        </Button>
        <p className="text-sm font-semibold">Total: {formatCurrency(total)}</p>
      </div>
    </div>
  );
}
