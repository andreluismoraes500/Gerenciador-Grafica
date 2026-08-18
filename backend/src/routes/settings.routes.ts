import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { canManageSettings, canViewSettings } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

export const settingsRoutes = Router();

// Configurações da empresa - ADMIN pode alterar, DESIGNER visualiza
settingsRoutes.get('/company', canViewSettings, settingsController.getCompanySettings);
settingsRoutes.put('/company', canManageSettings, settingsController.updateCompanySettings);
settingsRoutes.post('/company/logo', canManageSettings, upload.single('logo'), settingsController.uploadLogo);

// SMTP - apenas ADMIN
settingsRoutes.get('/smtp', canManageSettings, settingsController.getSmtpSettings);
settingsRoutes.put('/smtp', canManageSettings, settingsController.updateSmtpSettings);
settingsRoutes.post('/test-email', canManageSettings, settingsController.testEmail);

// Usuários - apenas ADMIN
settingsRoutes.get('/users', canManageSettings, settingsController.listUsers);
settingsRoutes.post('/users', canManageSettings, settingsController.createUser);
settingsRoutes.put('/users/:id', canManageSettings, settingsController.updateUser);
settingsRoutes.delete('/users/:id', canManageSettings, settingsController.deleteUser);

// Backup - apenas ADMIN
settingsRoutes.post('/backup', canManageSettings, settingsController.createBackup);

// Permissões - útil para o frontend saber o que mostrar
settingsRoutes.get('/permissions', (req, res) => {
  const user = (req as any).user;
  const role = user?.role || 'CLIENT';
  
  const permissions = {
    canViewClients: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageClients: ['ADMIN', 'ATTENDANT'].includes(role),
    canViewProducts: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageProducts: ['ADMIN', 'ATTENDANT'].includes(role),
    canViewOrders: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageOrders: ['ADMIN', 'ATTENDANT'].includes(role),
    canViewQuotes: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageQuotes: ['ADMIN', 'ATTENDANT'].includes(role),
    canViewProjects: ['ADMIN', 'ATTENDANT', 'DESIGNER', 'CLIENT'].includes(role),
    canManageProjects: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canViewStock: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageStock: ['ADMIN', 'ATTENDANT'].includes(role),
    canViewSuppliers: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageSuppliers: ['ADMIN', 'ATTENDANT'].includes(role),
    canViewFinance: ['ADMIN', 'ATTENDANT'].includes(role),
    canManageFinance: ['ADMIN'].includes(role),
    canManageTasks: ['ADMIN', 'ATTENDANT', 'DESIGNER'].includes(role),
    canManageSettings: ['ADMIN'].includes(role),
    canViewSettings: ['ADMIN', 'DESIGNER'].includes(role),
    role: role,
  };
  
  res.json(permissions);
});