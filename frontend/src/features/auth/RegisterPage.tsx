import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>Página de cadastro em construção.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
