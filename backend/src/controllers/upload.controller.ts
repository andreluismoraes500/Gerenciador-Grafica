import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { AuthRequest } from '../middlewares/auth';

export const uploadController = {
  async uploadImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const result = await uploadService.saveFile(req.file, 'images');
      res.json(result);
    } catch (e) { next(e); }
  },

  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const result = await uploadService.saveFile(req.file, 'documents');
      res.json(result);
    } catch (e) { next(e); }
  },

  async uploadMultiple(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
      const results = await uploadService.saveMultipleFiles(files, 'documents');
      res.json(results);
    } catch (e) { next(e); }
  },

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await uploadService.deleteFile(req.params.filename);
      res.status(204).send();
    } catch (e) { next(e); }
  }
};
