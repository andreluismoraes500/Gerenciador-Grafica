import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/AppError';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

export const uploadService = {
  async saveFile(file: Express.Multer.File, folder: string) {
    return {
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
      folder,
    };
  },

  async saveMultipleFiles(files: Express.Multer.File[], folder: string) {
    return Promise.all(files.map(file => this.saveFile(file, folder)));
  },

  async deleteFile(filename: string) {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) throw new AppError('File not found', 404);
    fs.unlinkSync(filePath);
  },
};
