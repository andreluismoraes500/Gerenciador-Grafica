import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authMiddleware } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

export const uploadRoutes = Router();

uploadRoutes.post('/image', authMiddleware, upload.single('image'), uploadController.uploadImage);
uploadRoutes.post('/document', authMiddleware, upload.single('document'), uploadController.uploadDocument);
uploadRoutes.post('/multiple', authMiddleware, upload.array('files', 10), uploadController.uploadMultiple);
uploadRoutes.delete('/:filename', authMiddleware, uploadController.deleteFile);
