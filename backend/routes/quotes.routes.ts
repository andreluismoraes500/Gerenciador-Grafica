import { Router } from 'express';
import { quotesController } from '../controllers/quotes.controller';
import { requireRole } from '../middlewares/auth';

export const quotesRoutes = Router();

quotesRoutes.get('/', quotesController.list);
quotesRoutes.get('/:id', quotesController.getById);
quotesRoutes.post('/', requireRole('ADMIN', 'ATTENDANT'), quotesController.create);
quotesRoutes.put('/:id', requireRole('ADMIN', 'ATTENDANT'), quotesController.update);
quotesRoutes.delete('/:id', requireRole('ADMIN'), quotesController.delete);
quotesRoutes.patch('/:id/status', requireRole('ADMIN', 'ATTENDANT'), quotesController.updateStatus);
quotesRoutes.get('/:id/pdf', quotesController.generatePDF);
quotesRoutes.post('/:id/send', requireRole('ADMIN', 'ATTENDANT'), quotesController.sendByEmail);
quotesRoutes.post('/:id/convert-to-order', requireRole('ADMIN', 'ATTENDANT'), quotesController.convertToOrder);