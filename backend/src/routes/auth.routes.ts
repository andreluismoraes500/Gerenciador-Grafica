import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth';

export const authRoutes = Router();

authRoutes.post('/login', authController.login);
authRoutes.post('/register', authController.register);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authMiddleware, authController.logout);
authRoutes.post('/forgot-password', authController.forgotPassword);
authRoutes.post('/reset-password', authController.resetPassword);
authRoutes.get('/me', authMiddleware, authController.getMe);
authRoutes.put('/me', authMiddleware, authController.updateMe);
authRoutes.post('/change-password', authMiddleware, authController.changePassword);
