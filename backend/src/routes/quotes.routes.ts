import { Router } from 'express';
import { quotesController } from '../controllers/quotes.controller';
import { canViewQuotes, canManageQuotes } from '../middlewares/auth';

export const quotesRoutes = Router();

// Visualização - todos podem ver (incluindo DESIGNER)
quotesRoutes.get('/', canViewQuotes, quotesController.list);
quotesRoutes.get('/:id', canViewQuotes, quotesController.getById);
quotesRoutes.get('/:id/pdf', canViewQuotes, quotesController.generatePDF);

// Gerenciamento - apenas ADMIN e ATTENDANT
quotesRoutes.post('/', canManageQuotes, quotesController.create);
quotesRoutes.put('/:id', canManageQuotes, quotesController.update);
quotesRoutes.delete('/:id', canManageQuotes, quotesController.delete);
quotesRoutes.patch('/:id/status', canManageQuotes, quotesController.updateStatus);
quotesRoutes.post('/:id/send', canManageQuotes, quotesController.sendByEmail);
quotesRoutes.post('/:id/convert-to-order', canManageQuotes, quotesController.convertToOrder);