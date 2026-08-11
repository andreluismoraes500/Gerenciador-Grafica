import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

let socket: Socket | null = null;

export function useSocket() {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      transports: ['websocket'], withCredentials: true
    });

    socket.emit('join', `user:${user.id}`);

    socket.on('order:created', (order) => {
      toast.success(`Novo pedido #${order.code} criado!`);
    });
    socket.on('order:status-changed', (order) => {
      toast.info(`Pedido #${order.code} atualizado para ${order.status}`);
    });
    socket.on('project:approval', (project) => {
      toast.success(`Projeto "${project.title}" foi aprovado! 🎉`);
    });

    return () => { socket?.disconnect(); };
  }, [user?.id]);

  return socket;
}