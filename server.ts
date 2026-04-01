import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const PORT = 3000;

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Setup Multer for saving uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage });

// Simple JSON Database helpers
const booksFile = path.join(dataDir, 'books.json');
const txFile = path.join(dataDir, 'transactions.json');

const readData = (file: string, defaultData: any) => {
  if (!fs.existsSync(file)) return defaultData;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return defaultData;
  }
};

const writeData = (file: string, data: any) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// API Routes
app.get('/api/books', (req, res) => {
  res.json(readData(booksFile, []));
});

app.post('/api/books', (req, res) => {
  writeData(booksFile, req.body);
  res.json({ success: true });
});

app.get('/api/transactions', (req, res) => {
  res.json(readData(txFile, []));
});

app.post('/api/transactions', (req, res) => {
  writeData(txFile, req.body);
  res.json({ success: true });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    message: 'File saved successfully', 
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`
  });
});

// Serve uploaded files statically if needed
app.use('/uploads', express.static(uploadsDir));

// Vite Middleware for development & Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
