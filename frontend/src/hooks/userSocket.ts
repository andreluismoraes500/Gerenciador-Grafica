import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

let socket: Socket | null = null;

export function useSocket() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    if (!user || !token) return;

    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

    socket = io(apiUrl, {
      transports: ['websocket'],
      auth: { token }, // 🔑 envia o JWT no handshake
    });

    socket.emit('join', `user:${user.id}`);

    socket.on('connect', () => console.log('✅ Socket conectado'));
    socket.on('connect_error', (err) => console.error('❌ Socket error:', err.message));

    socket.on('order:created', (order: any) => {
      toast.success(`Novo pedido #${order.code} criado!`);
    });
    socket.on('order:status-changed', (order: any) => {
      toast.info(`Pedido #${order.code} atualizado para ${order.status}`);
    });
    socket.on('project:approved', () => {
      toast.success('Projeto aprovado! 🎉');
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [user?.id, token]);

  return socket;
}