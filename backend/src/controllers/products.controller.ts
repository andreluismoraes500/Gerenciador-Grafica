import { Response, NextFunction } from 'express';
import { productsService } from '../services/products.service'; // <-- CORRIGIDO
import { AuthRequest } from '../middlewares/auth';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { logActivity } from '../services/activity.service';

export const productsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, category, isActive } = req.query;
      const result = await productsService.list({
        page: +page,
        limit: +limit,
        search: search as string,
        category: category as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getById(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      res.json(product);
    } catch (e) { next(e); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await productsService.create(data, req.user!.id);
      await logActivity(req.user!.id, 'CREATE_PRODUCT', 'Product', product.id, { name: product.name });
      res.status(201).json(product);
    } catch (e) { next(e); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateProductSchema.parse(req.body);
      const product = await productsService.update(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, data, req.user!.id);
      await logActivity(req.user!.id, 'UPDATE_PRODUCT', 'Product', product.id, { name: product.name });
      res.json(product);
    } catch (e) { next(e); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await productsService.delete(id, req.user!.id);
      await logActivity(req.user!.id, 'DELETE_PRODUCT', 'Product', id);
      res.status(204).send();
    } catch (e) { next(e); }
  },

async listCategories(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const categories = await productsService.listCategories();
    res.json(categories);
  } catch (e) { 
    console.error('[products.controller] listCategories error:', e);
    next(e); 
  }
},

  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, parentId } = req.body;
      const category = await productsService.createCategory({ name, description, parentId });
      res.status(201).json(category);
    } catch (e) { next(e); }
  },

  async getLowStock(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const products = await productsService.getLowStock();
      res.json(products);
    } catch (e) { next(e); }
  },

  async updateStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { quantity } = req.body;
      const product = await productsService.updateStock(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, quantity);
      res.json(product);
    } catch (e) { next(e); }
  }
};