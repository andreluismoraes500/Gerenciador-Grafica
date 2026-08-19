// frontend/src/components/crud/CrudPage.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "date" | "textarea" | "select";
  options?: { value: string; label: string }[];
  optionsUrl?: string;
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
  min?: number;
  step?: string;
  zod?: any;
}
export interface ColumnDefR {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
  className?: string;
}
export interface CrudConfig {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: ColumnDefR[];
  fields: FieldDef[];
  defaultValues?: Record<string, any>;
}

export const getPath = (o: any, p: string) =>
  p.split(".").reduce((a, k) => a?.[k], o);

// ✅ FUNÇÃO MELHORADA PARA BUSCAR OPÇÕES
export function useList(url: string): any[] {
  const { data } = useQuery({
    queryKey: ["options", url],
    queryFn: async () => {
      try {
        const response = await api.get(url, { params: { limit: 500 } });
        const d = response.data;

        // Suporta diferentes formatos de resposta
        if (Array.isArray(d)) return d;
        if (d?.data && Array.isArray(d.data)) return d.data;
        if (d?.items && Array.isArray(d.items)) return d.items;

        console.warn(
          `[useList] Formato de resposta inesperado para ${url}:`,
          d,
        );
        return [];
      } catch (error) {
        console.error(`[useList] Erro ao carregar ${url}:`, error);
        // Retorna array vazio em vez de propagar o erro
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    retry: 1,
  });
  return data || [];
}

function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, any> = {};
  for (const f of fields) {
    if (f.zod) {
      shape[f.name] = f.zod;
      continue;
    }
    if (f.type === "number") {
      shape[f.name] = f.required
        ? z.coerce.number({ invalid_type_error: "Obrigatório" })
        : z.coerce.number().optional();
    } else if (f.type === "email") {
      shape[f.name] = f.required
        ? z.string().min(1, "Obrigatório").email("Email inválido")
        : z.string().email("Email inválido").optional().or(z.literal(""));
    } else {
      shape[f.name] = f.required
        ? z.string().min(1, "Campo obrigatório")
        : z.string().optional();
    }
  }
  return z.object(shape);
}

function prepare(values: any, fields: FieldDef[]) {
  const out: any = {};
  for (const f of fields) {
    let v = values[f.name];
    if (v === "" || v === undefined || v === null) continue;
    if (f.type === "date") v = new Date(v + "T12:00:00").toISOString();
    out[f.name] = v;
  }
  return out;
}

export function CrudPage({ config }: { config: CrudConfig }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: [config.endpoint, search, page],
    queryFn: () =>
      api
        .get(config.endpoint, {
          params: { page, limit: 10, search: search || undefined },
        })
        .then((r) => r.data),
    placeholderData: (p) => p,
  });

  // ✅ CARREGAR OPÇÕES DE URLS
  const optionUrls = useMemo(
    () =>
      Array.from(
        new Set(
          config.fields.filter((f) => f.optionsUrl).map((f) => f.optionsUrl!),
        ),
      ),
    [config.fields],
  );

  const { data: optMap, isLoading: optionsLoading } = useQuery({
    queryKey: ["crud-opts", optionUrls],
    enabled: optionUrls.length > 0,
    queryFn: async () => {
      const m: Record<string, { value: string; label: string }[]> = {};
      for (const u of optionUrls) {
        try {
          const response = await api.get(u, { params: { limit: 500 } });
          const d = response.data;

          // Tenta extrair o array de dados
          let arr: any[] = [];
          if (Array.isArray(d)) {
            arr = d;
          } else if (d?.data && Array.isArray(d.data)) {
            arr = d.data;
          } else if (d?.items && Array.isArray(d.items)) {
            arr = d.items;
          } else {
            arr = [];
          }

          // Mapeia para o formato { value, label }
          m[u] = arr.map((x: any) => ({
            value: x.id || x.value,
            label: x.name ?? x.title ?? x.sku ?? x.email ?? String(x.id),
          }));
        } catch (error) {
          console.error(`[CrudPage] Erro ao carregar opções de ${u}:`, error);
          m[u] = [];
        }
      }
      return m;
    },
  });

  const schema = useMemo(() => buildSchema(config.fields), [config.fields]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({ resolver: zodResolver(schema) });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api.put(`${config.endpoint}/${editing.id}`, payload)
        : api.post(config.endpoint, payload),
    onSuccess: () => {
      toast.success(editing ? "Registro atualizado!" : "Registro criado!");
      qc.invalidateQueries({ queryKey: [config.endpoint] });
      close();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao salvar."),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`${config.endpoint}/${id}`),
    onSuccess: () => {
      toast.success("Excluído com sucesso.");
      qc.invalidateQueries({ queryKey: [config.endpoint] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Erro ao excluir."),
  });

  const close = () => {
    setOpen(false);
    setEditing(null);
    reset(config.defaultValues ?? {});
  };

  const openNew = () => {
    setEditing(null);
    reset(config.defaultValues ?? {});
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    const vals: any = {};
    for (const f of config.fields) {
      let v = getPath(row, f.name) ?? "";
      if (f.type === "date" && v) v = String(v).slice(0, 10);
      vals[f.name] = v;
    }
    reset(vals);
    setOpen(true);
  };

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64 pl-8"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((c) => (
                <TableHead key={c.key}>{c.header}</TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={config.columns.length + 1}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.columns.length + 1}>
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Nenhum registro encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row: any) => (
                <TableRow key={row.id}>
                  {config.columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render ? c.render(row) : (getPath(row, c.key) ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 flex items-center gap-1.5"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="text-xs font-medium hidden sm:inline">
                          Editar
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Excluir este registro?`))
                            del.mutate(row.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs font-medium hidden sm:inline">
                          Excluir
                        </span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Página {page} de {Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar" : "Novo"} — {config.title}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((v) =>
              save.mutate(prepare(v, config.fields)),
            )}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((f) => {
                const err = errors[f.name];
                const fieldOptions = f.options ?? optMap?.[f.optionsUrl!] ?? [];

                return (
                  <div
                    key={f.name}
                    className={
                      f.span === 2 ? "sm:col-span-2 space-y-2" : "space-y-2"
                    }
                  >
                    <Label>
                      {f.label}
                      {f.required && (
                        <span className="text-destructive"> *</span>
                      )}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        {...register(f.name)}
                        placeholder={f.placeholder}
                      />
                    ) : f.type === "select" ? (
                      <Select
                        {...register(f.name)}
                        placeholder="Selecione..."
                        options={fieldOptions}
                      />
                    ) : (
                      <Input
                        type={
                          f.type === "number"
                            ? "number"
                            : f.type === "date"
                              ? "date"
                              : f.type === "email"
                                ? "email"
                                : "text"
                        }
                        step={f.step}
                        min={f.min}
                        placeholder={f.placeholder}
                        {...register(f.name)}
                      />
                    )}
                    {err && (
                      <p className="text-xs text-destructive">
                        {String(err.message)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
