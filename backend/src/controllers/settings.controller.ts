import { Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { AuthRequest } from '../middlewares/auth';

const getRouteParamId = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

export const settingsController = {
  async getCompanySettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getCompanySettings();
      res.json(settings);
    } catch (e) { next(e); }
  },

  async updateCompanySettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const settings = await settingsService.updateCompanySettings(data);
      res.json(settings);
    } catch (e) { next(e); }
  },

  async uploadLogo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const settings = await settingsService.uploadLogo(req.file);
      res.json(settings);
    } catch (e) { next(e); }
  },

  async getSmtpSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getSmtpSettings();
      res.json(settings);
    } catch (e) { next(e); }
  },

  async updateSmtpSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const settings = await settingsService.updateSmtpSettings(data);
      res.json(settings);
    } catch (e) { next(e); }
  },

  async testEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { to } = req.body;
      await settingsService.testEmail(to);
      res.json({ message: 'Test email sent successfully' });
    } catch (e) { next(e); }
  },

// ... código existente

  async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const includeClients = req.query.includeClients === 'true';
      const users = await settingsService.listUsers(includeInactive, includeClients);
      res.json(users);
    } catch (e) { next(e); }
  },

// ... resto do código

  async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const user = await settingsService.createUser(data);
      res.status(201).json(user);
    } catch (e) { next(e); }
  },

  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const userId = getRouteParamId(req.params.id);
      const user = await settingsService.updateUser(userId, data);
      res.json(user);
    } catch (e) { next(e); }
  },

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Antes retornava 204 sem corpo. Agora retornamos o resultado
      // (excluído de verdade ou apenas desativado) para o frontend poder
      // exibir a mensagem correta ao usuário.
      const userId = getRouteParamId(req.params.id);
      const result = await settingsService.deleteUser(userId);
      res.status(200).json(result);
    } catch (e) { next(e); }
  },

  async createBackup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const backup = await settingsService.createBackup();
      res.json(backup);
    } catch (e) { next(e); }
  }
};
