// frontend/src/components/ui/search-select.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SearchSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Buscar...",
  className,
  isLoading = false,
  disabled = false,
  onSearchChange,
  searchValue: externalSearchValue = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  // ✅ Usa busca externa se fornecida, senão usa interna
  const query =
    externalSearchValue !== undefined && onSearchChange !== undefined
      ? externalSearchValue
      : internalQuery;

  // ✅ Filtra opções baseado na busca
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(q)),
    );
  }, [options, query]);

  // ✅ Fecha ao clicar fora
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        // Se for controle externo, limpa a busca externa
        if (onSearchChange) {
          onSearchChange("");
        } else {
          setInternalQuery("");
        }
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [onSearchChange]);

  // ✅ Fecha ao pressionar ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        if (onSearchChange) {
          onSearchChange("");
        } else {
          setInternalQuery("");
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSearchChange]);

  const handleSelect = (option: SearchSelectOption) => {
    onChange(option.value);
    setOpen(false);
    if (onSearchChange) {
      onSearchChange("");
    } else {
      setInternalQuery("");
    }
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClear = () => {
    onChange("");
    if (onSearchChange) {
      onSearchChange("");
    } else {
      setInternalQuery("");
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // ✅ Atualiza a busca (externa ou interna)
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalQuery(val);
    }

    setOpen(true);

    // ✅ Se apagou tudo, limpa a seleção
    if (val === "") {
      onChange("");
    }
  };

  // ✅ Mostra o label do item selecionado ou o query quando aberto
  const displayValue = open ? query : (selected?.label ?? "");

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          className="pl-8 pr-16 cursor-text"
          placeholder={placeholder}
          value={displayValue}
          onFocus={handleFocus}
          onChange={handleInputChange}
          disabled={disabled}
        />
        <div className="absolute right-1 top-1 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              title="Limpar seleção"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
              disabled && "opacity-50",
            )}
          />
        </div>
      </div>

      {/* ✅ Lista de resultados - SÓ APARECE QUANDO OPEN E TEM QUERY */}
      {open && !disabled && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-card shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado para "{query}"
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left transition-colors",
                  o.value === value && "bg-accent/50 font-medium",
                )}
                onClick={() => handleSelect(o)}
              >
                <div className="flex flex-col">
                  <span>{o.label}</span>
                  {o.subLabel && (
                    <span className="text-xs text-muted-foreground">
                      {o.subLabel}
                    </span>
                  )}
                </div>
                {o.value === value && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
