const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "src", "features");

const pages = [
  { folder: "auth", file: "RegisterPage.tsx", name: "RegisterPage" },
  { folder: "products", file: "ProductsPage.tsx", name: "ProductsPage" },
  { folder: "projects", file: "ProjectsPage.tsx", name: "ProjectsPage" },
  { folder: "orders", file: "OrdersPage.tsx", name: "OrdersPage" },
  { folder: "quotes", file: "QuotesPage.tsx", name: "QuotesPage" },
  { folder: "suppliers", file: "SuppliersPage.tsx", name: "SuppliersPage" },
  { folder: "tasks", file: "TasksPage.tsx", name: "TasksPage" },
  { folder: "settings", file: "SettingsPage.tsx", name: "SettingsPage" },
];

const template = (name) => `export function ${name}() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">${name.replace("Page", "")}</h1>
      <p className="text-muted-foreground">Página em construção...</p>
    </div>
  );
}
`;

let created = 0;
pages.forEach((p) => {
  const dir = path.join(baseDir, p.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, p.file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, template(p.name), "utf8");
    console.log(`✅ Criado: ${p.folder}/${p.file}`);
    created++;
  }
});

if (created === 0) console.log("Todos os arquivos já existem!");
else console.log(`\n🎉 ${created} arquivos criados com sucesso!`);
