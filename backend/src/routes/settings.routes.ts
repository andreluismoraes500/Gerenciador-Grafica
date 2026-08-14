import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { requireRole } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

export const settingsRoutes = Router();

// Rotas de empresa
settingsRoutes.get('/company', requireRole('ADMIN'), settingsController.getCompanySettings);
settingsRoutes.put('/company', requireRole('ADMIN'), settingsController.updateCompanySettings);
settingsRoutes.post('/company/logo', requireRole('ADMIN'), upload.single('logo'), settingsController.uploadLogo);

// Rotas SMTP
settingsRoutes.get('/smtp', requireRole('ADMIN'), settingsController.getSmtpSettings);
settingsRoutes.put('/smtp', requireRole('ADMIN'), settingsController.updateSmtpSettings);
settingsRoutes.post('/test-email', requireRole('ADMIN'), settingsController.testEmail);

// Rotas de usuários
settingsRoutes.get('/users', requireRole('ADMIN'), settingsController.listUsers);
settingsRoutes.post('/users', requireRole('ADMIN'), settingsController.createUser);
settingsRoutes.put('/users/:id', requireRole('ADMIN'), settingsController.updateUser);
settingsRoutes.delete('/users/:id', requireRole('ADMIN'), settingsController.deleteUser);

// Rotas de backup
settingsRoutes.post('/backup', requireRole('ADMIN'), settingsController.createBackup);

// Rota para verificar permissões (útil para frontend)
settingsRoutes.get('/permissions', requireRole('ADMIN'), (req, res) => {
  const user = (req as any).user;

  res.json({
    roles: ['ADMIN', 'DESIGNER', 'ATTENDANT', 'CLIENT'],
    user
  });
});