import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const uploadsDir = '/tmp/uploads';
const dataDir = '/tmp/data';

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

const booksFile = path.join(dataDir, 'books.json');
const txFile = path.join(dataDir, 'transactions.json');

const readData = (file: string, defaultData: any) => {
  if (!fs.existsSync(file)) return defaultData;
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch (e) { return defaultData; }
};

const writeData = (file: string, data: any) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

app.get('/api/books', (req, res) => res.json(readData(booksFile, [])));
app.post('/api/books', (req, res) => { writeData(booksFile, req.body); res.json({ success: true }); });
app.get('/api/transactions', (req, res) => res.json(readData(txFile, [])));
app.post('/api/transactions', (req, res) => { writeData(txFile, req.body); res.json({ success: true }); });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ message: 'File saved', filename: req.file.filename });
});

export default app;
