import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth';
import { registerSchema, loginSchema, resetPasswordSchema, updateProfileSchema } from '../validators/auth.validator';
import { logActivity } from '../services/activity.service';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rememberMe } = loginSchema.parse(req.body);
      const result = await authService.login(email, password, req.headers['user-agent'], req.ip);
      
      await logActivity(result.user.id, 'LOGIN', 'User', result.user.id, { ip: req.ip });
      
      if (rememberMe) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }
      
      res.json(result);
    } catch (e) { next(e); }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const user = await authService.register(data);
      await logActivity(user.id, 'REGISTER', 'User', user.id, { ip: req.ip });
      res.status(201).json(user);
    } catch (e) { next(e); }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
      if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing' });
      
      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch (e) { next(e); }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (e) { next(e); }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.json({ message: 'Reset email sent if account exists' });
    } catch (e) { next(e); }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(token, password);
      res.json({ message: 'Password reset successfully' });
    } catch (e) { next(e); }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.id);
      res.json(user);
    } catch (e) { next(e); }
  },

  async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.user!.id, data);
      res.json(user);
    } catch (e) { next(e); }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json({ message: 'Password changed successfully' });
    } catch (e) { next(e); }
  }
};
