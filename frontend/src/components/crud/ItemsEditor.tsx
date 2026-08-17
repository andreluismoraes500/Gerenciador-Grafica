// frontend/src/components/crud/ItemsEditor.tsx
import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchSelect,
  SearchSelectOption,
} from "@/components/ui/search-select";
import { formatCurrency } from "@/lib/utils";

export interface ItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface ItemsEditorProps {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
}

// Componente de busca de produto com SearchSelect
function ProductSearchSelect({
  value,
  onChange,
  onProductSelect,
  placeholder = "Buscar produto...",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onProductSelect?: (product: any) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce para evitar muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Buscar produtos com base na busca
  const { data: products, isLoading } = useQuery({
    queryKey: ["products-select", debouncedSearch],
    queryFn: () =>
      api
        .get("/products", {
          params: {
            limit: 50,
            search: debouncedSearch || undefined,
          },
        })
        .then((r) => r.data.data || []),
    enabled: true,
  });

  const options: SearchSelectOption[] = useMemo(() => {
    if (!products) return [];
    return products.map((p: any) => ({
      value: p.id,
      label: p.name,
      subLabel: `SKU: ${p.sku} • Estoque: ${p.stock} • R$ ${p.salePrice.toFixed(2)}`,
    }));
  }, [products]);

  const handleSelect = (val: string) => {
    onChange(val);
    if (onProductSelect && val) {
      const product = products?.find((p: any) => p.id === val);
      if (product) onProductSelect(product);
    }
    setSearch("");
  };

  // Quando o valor externo mudar (ex: limpeza do formulário)
  useEffect(() => {
    if (!value) {
      setSearch("");
    }
  }, [value]);

  return (
    <SearchSelect
      value={value}
      onChange={handleSelect}
      options={options}
      placeholder={placeholder}
      isLoading={isLoading}
      disabled={disabled}
      onSearchChange={setSearch}
      searchValue={search}
    />
  );
}

export function ItemsEditor({ items, onChange }: ItemsEditorProps) {
  const setItem = (idx: number, patch: Partial<ItemRow>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    onChange([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleProductSelect = (idx: number, product: any) => {
    setItem(idx, {
      productId: product.id,
      unitPrice: product.salePrice,
    });
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">Nenhum item adicionado</p>
          <p className="text-xs">Clique em "Adicionar item" para começar</p>
        </div>
      ) : (
        items.map((it, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-center gap-2 p-3 bg-muted/30 rounded-lg"
          >
            <div className="col-span-5">
              <ProductSearchSelect
                value={it.productId}
                onChange={(val) => setItem(idx, { productId: val })}
                onProductSelect={(product) => handleProductSelect(idx, product)}
                placeholder="Buscar produto por nome ou SKU..."
              />
            </div>

            <div className="col-span-2">
              <Input
                type="number"
                min={1}
                value={it.quantity || ""}
                placeholder="Qtd"
                className="h-10"
                onChange={(e) =>
                  setItem(idx, { quantity: Number(e.target.value) || 1 })
                }
              />
            </div>

            <div className="col-span-3">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={it.unitPrice || ""}
                placeholder="Preço"
                className="h-10"
                onChange={(e) =>
                  setItem(idx, { unitPrice: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="col-span-1 text-sm font-semibold text-right">
              {formatCurrency(it.quantity * it.unitPrice)}
            </div>

            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="border-dashed"
        >
          <Plus className="mr-1 h-3 w-3" />
          Adicionar item
        </Button>
        <div className="text-sm font-semibold">
          Total: <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
