import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Palette,
  ShoppingCart,
  FileText,
  Truck,
  CheckSquare,
  Settings,
  ChevronLeft,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/clients", icon: Users, label: "Clientes" },
  { to: "/products", icon: Package, label: "Produtos" },
  { to: "/projects", icon: Palette, label: "Projetos" },
  { to: "/orders", icon: ShoppingCart, label: "Pedidos" },
  { to: "/quotes", icon: FileText, label: "Orçamentos" },
  { to: "/suppliers", icon: Truck, label: "Fornecedores" },
  { to: "/tasks", icon: CheckSquare, label: "Tarefas" },
  { to: "/settings", icon: Settings, label: "Configurações" },
  { to: "/stock", icon: Package, label: "Insumos" }, // Ou Box
  { to: "/transactions", icon: Wallet, label: "Financeiro" },
];

export function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
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
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
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
        ))}
      </nav>

      <div className={cn("p-4 border-t border-border", collapsed && "p-2")}>
        {!collapsed && (
          <div className="text-xs text-muted-foreground">v1.0.0 • © 2026</div>
        )}
      </div>
    </motion.aside>
  );
}
