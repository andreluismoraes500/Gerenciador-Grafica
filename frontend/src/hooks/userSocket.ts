import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/api/client';
import { toast } from 'sonner';

export function useAuth() {
  const navigate = useNavigate();
  const { user, token, setAuth, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string; rememberMe?: boolean }) =>
      api.post('/auth/login', data).then(r => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.refreshToken);
      toast.success(`Bem-vindo, ${data.user.name}!`);
      navigate('/');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Erro ao fazer login';
      toast.error(message);
    }
  });

  const logout = () => {
    storeLogout();
    toast.info('Sessão encerrada');
    navigate('/login');
  };

  return {
    user,
    token,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}