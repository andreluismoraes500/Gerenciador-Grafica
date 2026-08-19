import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';

// Importar rotas
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
import { notificationsRoutes } from './routes/notifications.routes';
import { transactionsRoutes } from './routes/transactions.routes';
import { stockItemsRoutes } from './routes/stockItems.routes';
import { purchasesRoutes } from './routes/purchases.routes';

import { errorHandler } from './middlewares/errorHandler';
import { authMiddleware } from './middlewares/auth';
import { setupSocket } from './config/socket';

import 'dotenv/config';


process.env.TZ = 'America/Sao_Paulo';

// BigInt para JSON
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();
const server = createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});
setupSocket(io);

// Middlewares globais
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Configurar diretório de uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir arquivos estáticos com cabeçalhos corretos
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf' || ext === '.psd' || ext === '.ai' || ext === '.zip' || ext === '.rar') {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
}));

// 🔧 ROTA ESPECÍFICA PARA DOWNLOAD DE ARQUIVOS
app.get('/api/files/download/:filename', (req, res): void => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
      return;
    }
    
    // Configura cabeçalhos para download
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Envia o arquivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Erro no stream do arquivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao ler o arquivo' });
      }
    });
  } catch (error) {
    console.error('Erro no download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno ao processar download' });
    }
  }
});

// Rate limit para login
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos.' }
}));

// Healthcheck
app.get('/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString()
  });
});

// Rotas públicas
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Rotas protegidas
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/products', authMiddleware, productsRoutes);
app.use('/api/projects', authMiddleware, projectsRoutes);
app.use('/api/orders', authMiddleware, ordersRoutes);
app.use('/api/quotes', authMiddleware, quotesRoutes);
app.use('/api/suppliers', authMiddleware, suppliersRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/transactions', authMiddleware, transactionsRoutes);
app.use('/api/stock-items', authMiddleware, stockItemsRoutes);
app.use('/api/purchases', authMiddleware, purchasesRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.path,
    method: req.method
  });
});

// Error handler global
app.use(errorHandler);

// Attach IO para controllers acessarem via req.app.get('io')
app.set('io', io);

const PORT = Number(process.env.PORT) || 4000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PrintFlow API rodando na porta ${PORT}`);
  console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Upload dir: ${uploadDir}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido. Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado.');
    process.exit(0);
  });
});