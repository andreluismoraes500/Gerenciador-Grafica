import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  BUDGET: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PRODUCTION: "bg-purple-100 text-purple-800 border-purple-200",
  READY: "bg-green-100 text-green-800 border-green-200",
  DELIVERED: "bg-gray-100 text-gray-800 border-gray-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  // Adicione outros conforme Enums do Prisma
};

export function StatusBadge({ status }: { status: string }) {
  const colorClass =
    statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span
      className={cn(
        "px-2.5 py-0.5 text-xs font-medium rounded-full border",
        colorClass,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
