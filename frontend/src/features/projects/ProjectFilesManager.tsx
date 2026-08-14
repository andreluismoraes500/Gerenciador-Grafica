import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Upload,
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
  FolderOpen,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
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

const FILE_ICONS: Record<string, { icon: any; color: string }> = {
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
  isDesigner = true,
}: ProjectFilesManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Query para buscar arquivos do projeto
  const {
    data: project,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
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
    onSuccess: (data) => {
      toast.success(`${data.length || "Arquivo(s)"} enviado(s) com sucesso!`);
      refetch();
      setUploading(false);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || "Erro ao fazer upload dos arquivos.";
      toast.error(message);
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
      refetch();
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
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao atualizar arquivo.");
    },
  });

  // Configuração do Dropzone
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      uploadMutation.mutate(formData);
    },
    [uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".psd", ".ai", ".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/x-rar-compressed": [".rar"],
    },
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
  });

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

  const hasFinalArt = files.some((f: ProjectFile) => f.isFinal);

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
      {/* Status da Arte Final */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              hasFinalArt ? "bg-green-500" : "bg-yellow-500",
            )}
          />
          <span className="text-sm font-medium">
            {hasFinalArt
              ? "Arte final definida ✅"
              : "Nenhuma arte final marcada ⚠️"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {files.filter((f: ProjectFile) => f.isFinal).length} de {files.length}{" "}
          arquivo(s)
        </span>
      </div>

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
            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
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
              <FolderOpen className="mr-2 h-4 w-4" />
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
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <File className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm">
            Nenhum arquivo vinculado a este projeto ainda.
          </p>
          <p className="text-xs">
            Faça upload das artes e layouts para começar.
          </p>
        </div>
      )}

      {/* Dica para conclusão */}
      {isDesigner && !hasFinalArt && files.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
              Para concluir este projeto, você precisa marcar um arquivo como
              "Arte Final"
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Clique no ícone <FileCheck className="inline h-3 w-3" /> ao lado
              do arquivo para marcá-lo como arte final.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

