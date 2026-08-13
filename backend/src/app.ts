import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRoutes } from './routes/auth.routes';
import { clientsRoutes } from './routes/clients.routes';
import { productsRoutes } from './routes/products.routes';
import { projectsRoutes } from './routes/projects.routes';
import { ordersRoutes } from './routes/orders.routes';
import { quotesRoutes } from './routes/quotes.routes';
import { suppliersRoutes } from './routes/suppliers.routes';
import { tasksRoutes } from './routes/tasks.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { settingsRoutes } from './routes/settings.routes';
import { uploadRoutes } from './routes/upload.routes';
import { errorHandler } from './middlewares/errorHandler';
import { setupSocket } from './config/socket';
import { authMiddleware } from './middlewares/auth';
import { notificationsRoutes } from './routes/notifications.routes';
import { transactionsRoutes } from './routes/transactions.routes';
import { stockItemsRoutes } from './routes/stockItems.routes';

(BigInt.prototype as any).toJSON = function () { return Number(this); };


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});
setupSocket(io);

// Middlewares globais
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// Healthcheck
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// Routes públicas
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Routes protegidas
app.use('/api/clients',   authMiddleware, clientsRoutes);
app.use('/api/products',  authMiddleware, productsRoutes);
app.use('/api/projects',  authMiddleware, projectsRoutes);
app.use('/api/orders',    authMiddleware, ordersRoutes);
app.use('/api/quotes',    authMiddleware, quotesRoutes);
app.use('/api/suppliers', authMiddleware, suppliersRoutes);
app.use('/api/tasks',     authMiddleware, tasksRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/settings',  authMiddleware, settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/transactions', authMiddleware, transactionsRoutes);
app.use('/api/stock-items', authMiddleware, stockItemsRoutes);

// 404
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler global
app.use(errorHandler);

// Attach IO para controllers acessarem via req.app.get('io')
app.set('io', io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 PrintFlow API running on port ${PORT}`);
});
