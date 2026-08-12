import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

let socket: Socket | null = null;

export function useSocket() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token); // Captura o token do estado

  useEffect(() => {
    if (!user || !token) return;

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
    
    // O segredo está aqui: enviando o token no handshake
    socket = io(apiUrl, {
      transports: ['websocket'],
      auth: { token } 
    });

    socket.emit('join', `user:${user.id}`);

    socket.on('connect', () => console.log('✅ Socket conectado com sucesso!'));
    socket.on('connect_error', (err) => console.error('❌ Erro no Socket:', err.message));

    socket.on('order:created', (order) => {
      toast.success(`Novo pedido #${order.code} criado!`);
    });
    
    socket.on('order:status-changed', (order) => {
      toast.info(`Pedido #${order.code} atualizado para ${order.status}`);
    });
    
    socket.on('project:approved', ({ projectId }) => {
      toast.success(`Projeto foi aprovado! 🎉`);
    });

    return () => { 
      socket?.disconnect(); 
      socket = null;
    };
  }, [user?.id, token]); // Re-conecta se o token mudar

  return socket;
}