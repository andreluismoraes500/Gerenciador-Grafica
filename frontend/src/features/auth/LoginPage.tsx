import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import api from "@/api/client";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      console.log("[LOGIN] Enviando requisição para o backend...");
      const res = await api.post("/auth/login", { ...data, rememberMe });
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.refreshToken);
      toast.success(`Bem-vindo, ${data.user.name}!`);
      navigate("/");
    },
    onError: (error: any) => {
      console.error("[LOGIN] Erro:", error);
      let msg: string;
      if (!error?.response) {
        msg =
          "Não foi possível conectar ao backend. Verifique se o servidor está rodando (npm run dev na pasta backend).";
      } else if (error.response.status === 401) {
        msg = "Email ou senha inválidos.";
      } else if (error.response.status === 429) {
        msg = "Muitas tentativas de login. Aguarde alguns minutos.";
      } else {
        msg = error.response.data?.error || "Erro ao fazer login.";
      }
      setFormError(msg);
      toast.error(msg);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              🎨 PrintFlow Studio
            </CardTitle>
            <CardDescription>Entre com suas credenciais</CardDescription>
          </CardHeader>

          <form
            onSubmit={handleSubmit((data) => {
              setFormError(null);
              mutation.mutate(data);
            })}
          >
            <CardContent className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@printflow.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                />
                <Label htmlFor="rememberMe">Lembrar-me</Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-sm text-center">
                <Link
                  to="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="text-sm text-center">
                Não tem conta?{" "}
                <Link to="/register" className="text-primary hover:underline">
                  Cadastre-se
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
