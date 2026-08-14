import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  X,
  File,
  Image,
  FileArchive,
  FileText,
  FileCheck,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  version: number;
  size: number;
  isFinal: boolean;
  uploadedBy?: string;
  createdAt: string;
}

interface ProjectFilesManagerProps {
  projectId: string;
  projectTitle: string;
  isDesigner?: boolean;
}

const FILE_ICONS: Record<string, any> = {
  PSD: { icon: Image, color: "text-blue-500" },
  AI: { icon: Image, color: "text-orange-500" },
  PDF: { icon: FileText, color: "text-red-500" },
  PNG: { icon: Image, color: "text-green-500" },
  JPG: { icon: Image, color: "text-yellow-500" },
  JPEG: { icon: Image, color: "text-yellow-500" },
  GIF: { icon: Image, color: "text-purple-500" },
  WEBP: { icon: Image, color: "text-teal-500" },
  ZIP: { icon: FileArchive, color: "text-gray-500" },
  RAR: { icon: FileArchive, color: "text-gray-500" },
};

const DEFAULT_ICON = { icon: File, color: "text-gray-400" };

export function ProjectFilesManager({
  projectId,
  projectTitle,
  isDesigner = false,
}: ProjectFilesManagerProps) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Query para buscar arquivos do projeto
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId, "files"],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
  });

  const files = project?.files || [];

  // Mutation para upload de arquivos
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post(
        `/projects/${projectId}/files`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percent);
            }
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Arquivo(s) enviado(s) com sucesso!");
      qc.invalidateQueries({ queryKey: ["project", projectId, "files"] });
      setUploading(false);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error || "Erro ao fazer upload dos arquivos.",
      );
      setUploading(false);
      setUploadProgress(0);
    },
  });

  // Mutation para deletar arquivo
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) =>
      api.delete(`/projects/${projectId}/files/${fileId}`),
    onSuccess: () => {
      toast.success("Arquivo removido com sucesso.");
      qc.invalidateQueries({ queryKey: ["project", projectId, "files"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao remover arquivo.");
    },
  });

  // Mutation para marcar/desmarcar como final
  const toggleFinalMutation = useMutation({
    mutationFn: ({ fileId, isFinal }: { fileId: string; isFinal: boolean }) =>
      api.patch(`/projects/${projectId}/files/${fileId}`, { isFinal }),
    onSuccess: () => {
      toast.success("Arquivo atualizado com sucesso.");
      qc.invalidateQueries({ queryKey: ["project", projectId, "files"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao atualizar arquivo.");
    },
  });

  // Configuração do Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".psd", ".ai", ".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/x-rar-compressed": [".rar"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: handleDrop,
    disabled: uploading,
  });

  async function handleDrop(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await uploadMutation.mutateAsync(formData);
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleDelete = (fileId: string) => {
    if (confirm("Tem certeza que deseja remover este arquivo?")) {
      deleteMutation.mutate(fileId);
    }
  };

  const handleToggleFinal = (fileId: string, currentState: boolean) => {
    toggleFinalMutation.mutate({ fileId, isFinal: !currentState });
  };

  const handleDownload = (file: ProjectFile) => {
    window.open(file.url, "_blank");
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toUpperCase();
    return FILE_ICONS[type] || DEFAULT_ICON;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Área de Upload */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          uploading && "opacity-60 pointer-events-none",
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium">Enviando arquivo...</p>
            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">
              {isDragActive
                ? "Solte os arquivos aqui"
                : "Arraste arquivos ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PSD, AI, PDF, PNG, JPG, ZIP • Até 50MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={(e) => e.stopPropagation()}
            >
              Selecionar arquivos
            </Button>
          </>
        )}
      </div>

      {/* Lista de Arquivos */}
      {files.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              Arquivos do Projeto ({files.length})
            </h4>
            <span className="text-xs text-muted-foreground">
              {files.filter((f: ProjectFile) => f.isFinal).length} arte(s)
              final(is)
            </span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {files.map((file: ProjectFile) => {
              const { icon: FileIcon, color } = getFileIcon(file.type);
              const isFinal = file.isFinal;

              return (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group",
                    isFinal && "border-primary/50 bg-primary/5",
                  )}
                >
                  <div className={cn("p-2 rounded-lg bg-muted", color)}>
                    <FileIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      {isFinal && (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                          <CheckCircle className="h-3 w-3" />
                          Final
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>Versão {file.version}</span>
                      <span>•</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file)}
                      title="Baixar arquivo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {isDesigner && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            isFinal ? "text-primary" : "text-muted-foreground",
                          )}
                          onClick={() => handleToggleFinal(file.id, isFinal)}
                          title={
                            isFinal
                              ? "Desmarcar como final"
                              : "Marcar como arte final"
                          }
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(file.id)}
                          title="Remover arquivo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <File className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm">
            Nenhum arquivo vinculado a este projeto ainda.
          </p>
          <p className="text-xs">
            Faça upload das artes e layouts para começar.
          </p>
        </div>
      )}
    </div>
  );
}
function useDropzone({
  accept,
  maxSize,
  onDrop,
  disabled,
}: {
  accept: Record<string, string[]>;
  maxSize: number;
  onDrop: (acceptedFiles: File[]) => Promise<void> | void;
  disabled: boolean;
}): {
  getRootProps: () => any;
  getInputProps: () => any;
  isDragActive: boolean;
} {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isAcceptedFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const extension = `.${fileName.split(".").pop() || ""}`;
    const acceptedExtensions = Object.values(accept)
      .flat()
      .map((value) => value.toLowerCase());

    const mimeMatches = Object.entries(accept).some(
      ([mimeType, extensions]) => {
        if (mimeType.endsWith("/*")) {
          const baseType = mimeType.slice(0, -1);
          return file.type.startsWith(baseType);
        }

        if (file.type === mimeType) {
          return true;
        }

        return extensions.some((ext) => ext.toLowerCase() === extension);
      },
    );

    const extensionMatches = acceptedExtensions.includes(extension);

    return mimeMatches || extensionMatches;
  };

  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (disabled || !fileList) return;

    const files = Array.from(fileList);
    const validFiles = files.filter(
      (file) =>
        file.size <= maxSize &&
        (isAcceptedFile(file) || Object.keys(accept).length === 0),
    );

    if (validFiles.length > 0) {
      await onDrop(validFiles);
    }

    const rejectedCount = files.length - validFiles.length;
    if (rejectedCount > 0) {
      toast.warning(
        `Alguns arquivos foram ignorados. Verifique o tipo ou o tamanho máximo (até ${Math.round(maxSize / (1024 * 1024))}MB).`,
      );
    }
  };

  const getRootProps = () => ({
    onClick: (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      if ((event.target as HTMLElement).closest("button")) return;
      inputRef.current?.click();
    },
    onDragEnter: (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(true);
    },
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(true);
    },
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
    },
    onDrop: async (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
      await handleFiles(event.dataTransfer.files);
    },
  });

  const getInputProps = () => ({
    ref: inputRef,
    type: "file",
    multiple: true,
    accept: Object.values(accept).flat().join(","),
    disabled,
    onChange: async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      await handleFiles(event.target.files);
      event.target.value = "";
    },
  });

  return {
    getRootProps,
    getInputProps,
    isDragActive,
  };
}
