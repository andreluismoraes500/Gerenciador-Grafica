import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Palette,
  Box,
  Truck,
  Wallet,
  CheckSquare,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { usePermissions } from "@/hooks/usePermissions";

// Definição de cada item com permissão necessária para VISUALIZAR
const menuItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", permission: "view" },
  {
    to: "/clients",
    icon: Users,
    label: "Clientes",
    permission: "canViewClients",
  },
  {
    to: "/products",
    icon: Package,
    label: "Produtos",
    permission: "canViewProducts",
  },
  {
    to: "/kits",
    icon: Package,
    label: "Kits",
    permission: "canViewProducts",
  },
  {
    to: "/quotes",
    icon: FileText,
    label: "Orçamentos",
    permission: "canViewQuotes",
  },
  {
    to: "/orders",
    icon: ShoppingCart,
    label: "Pedidos",
    permission: "canViewOrders",
  },
  {
    to: "/projects",
    icon: Palette,
    label: "Projetos",
    permission: "canViewProjects",
  },
  { to: "/stock", icon: Box, label: "Insumos", permission: "canViewStock" },
  {
    to: "/suppliers",
    icon: Truck,
    label: "Fornecedores",
    permission: "canViewSuppliers",
  },
  {
    to: "/purchases",
    icon: ShoppingCart,
    label: "Compras",
    permission: "canViewFinance",
  },
  {
    to: "/transactions",
    icon: Wallet,
    label: "Financeiro",
    permission: "canViewFinance",
  },
  {
    to: "/tasks",
    icon: CheckSquare,
    label: "Tarefas",
    permission: "canManageTasks",
  },
  {
    to: "/settings",
    icon: Settings,
    label: "Configurações",
    permission: "canViewSettings",
  },
];

export function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const { permissions, isLoading } = usePermissions();

  // Filtra os itens baseado nas permissões
  const visibleItems = menuItems.filter((item) => {
    if (item.permission === "view") return true;
    return (permissions as any)[item.permission] === true;
  });

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      className="h-screen bg-card border-r border-border flex flex-col sticky top-0"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && <span className="font-bold text-lg">🎨 PrintFlow</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-accent rounded-lg"
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))
        )}
      </nav>

      <div className={cn("p-4 border-t border-border", collapsed && "p-2")}>
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            {permissions.role && (
              <span className="block capitalize">
                {permissions.role.toLowerCase()}
              </span>
            )}
            <span>v1.0.0 • © 2026</span>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
