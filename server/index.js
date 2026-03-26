const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const {
  handleDeploy, serveDeploy, listDeployments, subdomainMiddleware, streamLogs,
  deleteDeployment, listVersions, rollbackDeployment, handleGithubDeploy,
} = require('./routes/deploy');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiter behind nginx/docker
app.set('trust proxy', 1);

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const deployLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many deployments. Please wait a minute.' },
});

// Subdomain routing
app.use(subdomainMiddleware);

// Multer
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

// Auth routes (public)
app.use('/api/auth', authRoutes);
app.use('/health', healthRoutes);

// Protected deploy routes
app.post('/api/deploy', requireAuth, deployLimiter, upload.single('file'), handleDeploy);
app.post('/api/deploy/github', requireAuth, deployLimiter, handleGithubDeploy);
app.get('/api/deploy/logs/:id', streamLogs);

// Protected deployment management
app.get('/api/deployments', requireAuth, listDeployments);
app.delete('/api/deployments/:id', requireAuth, deleteDeployment);
app.get('/api/deployments/:id/versions', requireAuth, listVersions);
app.post('/api/deployments/:id/rollback', requireAuth, rollbackDeployment);

// Public — serve deployed sites
app.get('/deploy/:id', serveDeploy);
app.get('/deploy/:id/*', serveDeploy);

// Serve React frontend
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`ShelKit running at http://localhost:${PORT}`);
  console.log(`Shelby: ${process.env.SHELBY_PRIVATE_KEY ? 'live (' + (process.env.SHELBY_NETWORK || 'testnet') + ')' : 'stub mode'}`);
  console.log(`Database: SQLite`);
});
