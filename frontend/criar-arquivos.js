const fs = require("fs");
const path = require("path");

const files = {
  "src/features/auth/RegisterPage.tsx": `export function RegisterPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Cadastro</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/clients/ClientsPage.tsx": `export function ClientsPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Clientes</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/products/ProductsPage.tsx": `export function ProductsPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Produtos</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/projects/ProjectsPage.tsx": `export function ProjectsPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Projetos</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/orders/OrdersPage.tsx": `export function OrdersPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Pedidos</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/quotes/QuotesPage.tsx": `export function QuotesPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Orçamentos</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/suppliers/SuppliersPage.tsx": `export function SuppliersPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Fornecedores</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/tasks/TasksPage.tsx": `export function TasksPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Tarefas</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,
  "src/features/settings/SettingsPage.tsx": `export function SettingsPage() { return <div className="p-6"><h1 className="text-3xl font-bold">Configurações</h1><p className="text-muted-foreground">Em construção...</p></div>; }`,

  "src/features/dashboard/StatusPieChart.tsx": `export function StatusPieChart() { return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Gráfico de Status</div>; }`,
  "src/features/dashboard/TopProducts.tsx": `export function TopProducts() { return <div className="h-[200px] flex items-center justify-center text-muted-foreground">Top Produtos</div>; }`,
  "src/features/dashboard/ActivityFeed.tsx": `export function ActivityFeed() { return <div className="h-[200px] flex items-center justify-center text-muted-foreground">Atividades</div>; }`,

  "src/components/layout/AuthLayout.tsx": `import { Outlet } from "react-router-dom";\nexport default function AuthLayout() { return <Outlet />; }`,
  "src/components/layout/Topbar.tsx": `import { useAuthStore } from "@/store/auth.store";\nexport function Topbar({ onNotificationsClick }: any) { const user = useAuthStore((s) => s.user); return <header className="h-16 border-b bg-card flex items-center px-6 justify-between"><span>Olá, {user?.name || 'Usuário'}</span><button onClick={onNotificationsClick}>🔔</button></header>; }`,
  "src/components/notifications/NotificationPanel.tsx": `export function NotificationPanel({ open, onClose }: any) { return open ? <div className="fixed top-16 right-0 w-80 h-full bg-card border-l p-4 z-50 shadow-xl"><h2 className="font-bold">Notificações</h2><button onClick={onClose} className="mt-4 text-sm text-red-500">Fechar</button></div> : null; }`,

  "src/components/ui/skeleton.tsx": `export function Skeleton({ className }: any) { return <div className={\`animate-pulse rounded-md bg-muted \${className || ''}\`} />; }`,
  "src/components/ui/label.tsx": `import * as React from "react";\nexport const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({className, ...props}, ref) => <label ref={ref} className={\`text-sm font-medium \${className || ''}\`} {...props} />);`,
  "src/components/ui/checkbox.tsx": `import * as React from "react";\nexport const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({className, ...props}, ref) => <input ref={ref} type="checkbox" className={\`h-4 w-4 \${className || ''}\`} {...props} />);`,
};

let created = 0;
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log("✅ Criado:", filePath);
    created++;
  }
}
if (created === 0) console.log("Todos os arquivos já existem!");
else
  console.log(
    `\n🎉 ${created} arquivos criados com sucesso! O Vite vai recarregar automaticamente.`,
  );
