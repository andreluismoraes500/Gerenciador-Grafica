import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { requireRole } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

export const settingsRoutes = Router();

settingsRoutes.get('/company', requireRole('ADMIN'), settingsController.getCompanySettings);
settingsRoutes.put('/company', requireRole('ADMIN'), settingsController.updateCompanySettings);
settingsRoutes.post('/company/logo', requireRole('ADMIN'), upload.single('logo'), settingsController.uploadLogo);
settingsRoutes.get('/smtp', requireRole('ADMIN'), settingsController.getSmtpSettings);
settingsRoutes.put('/smtp', requireRole('ADMIN'), settingsController.updateSmtpSettings);
settingsRoutes.post('/test-email', requireRole('ADMIN'), settingsController.testEmail);
settingsRoutes.get('/users', requireRole('ADMIN'), settingsController.listUsers);
settingsRoutes.post('/users', requireRole('ADMIN'), settingsController.createUser);
settingsRoutes.put('/users/:id', requireRole('ADMIN'), settingsController.updateUser);
settingsRoutes.delete('/users/:id', requireRole('ADMIN'), settingsController.deleteUser);
settingsRoutes.post('/backup', requireRole('ADMIN'), settingsController.createBackup);