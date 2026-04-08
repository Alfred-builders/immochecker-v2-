import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';

// Load .env from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { testConnection } from './db/index.js';
import { verifyToken } from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import preferenceRoutes from './routes/preferences.js';
import batimentsRoutes from './routes/batiments.js';
import lotsRoutes from './routes/lots.js';
import importRoutes from './routes/import.js';
import tiersRoutes from './routes/tiers.js';
import missionsRoutes from './routes/missions.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── Health check ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Protected routes ───────────────────────────────────────────
app.use('/api/workspaces', verifyToken, workspaceRoutes);
app.use('/api/preferences', verifyToken, preferenceRoutes);
app.use('/api/batiments', verifyToken, batimentsRoutes);
app.use('/api/lots', verifyToken, lotsRoutes);
app.use('/api/import', verifyToken, importRoutes);
app.use('/api/tiers', verifyToken, tiersRoutes);
app.use('/api/missions', verifyToken, missionsRoutes);

// ─── 404 catch-all for /api/* ───────────────────────────────────
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Route API non trouvée' });
});

// ─── Production: serve frontend ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Start ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[Server] ImmoChecker V2 running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  await testConnection();
});
