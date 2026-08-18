import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

export interface Permissions {
  canViewClients: boolean;
  canManageClients: boolean;
  canViewProducts: boolean;
  canManageProducts: boolean;
  canViewOrders: boolean;
  canManageOrders: boolean;
  canViewQuotes: boolean;
  canManageQuotes: boolean;
  canViewProjects: boolean;
  canManageProjects: boolean;
  canViewStock: boolean;
  canManageStock: boolean;
  canViewSuppliers: boolean;
  canManageSuppliers: boolean;
  canViewFinance: boolean;
  canManageFinance: boolean;
  canManageTasks: boolean;
  canManageSettings: boolean;
  canViewSettings: boolean;
  role: string;
}

const defaultPermissions: Permissions = {
  canViewClients: false,
  canManageClients: false,
  canViewProducts: false,
  canManageProducts: false,
  canViewOrders: false,
  canManageOrders: false,
  canViewQuotes: false,
  canManageQuotes: false,
  canViewProjects: false,
  canManageProjects: false,
  canViewStock: false,
  canManageStock: false,
  canViewSuppliers: false,
  canManageSuppliers: false,
  canViewFinance: false,
  canManageFinance: false,
  canManageTasks: false,
  canManageSettings: false,
  canViewSettings: false,
  role: 'CLIENT',
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  
  const { data, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.get('/settings/permissions').then((r) => r.data),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    permissions: data || defaultPermissions,
    isLoading,
    isAdmin: user?.role === 'ADMIN',
    isDesigner: user?.role === 'DESIGNER',
    isAttendant: user?.role === 'ATTENDANT',
    isClient: user?.role === 'CLIENT',
  };
}