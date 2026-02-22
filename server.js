const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Data dosyası
const DATA_FILE = '/data/memories.json';
const UPLOAD_DIR = '/data/uploads';

// Klasörleri oluştur
if (!fs.existsSync('/data')) fs.mkdirSync('/data', { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ memories: [] }));

// Middleware
app.use(express.json());
app.use(express.static('/app/public'));
app.use('/uploads', express.static(UPLOAD_DIR));

// Multer - dosya yükleme ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2,9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp4|mov|webm|mp3|ogg/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext.slice(1))) cb(null, true);
    else cb(new Error('Desteklenmeyen dosya türü'));
  }
});

// Veri okuma/yazma yardımcıları
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API: Tüm anıları getir
app.get('/api/memories', (req, res) => {
  const data = readData();
  res.json(data.memories);
});

// API: Anı yükle (dosya)
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    const { author, type, message } = req.body;
    if (!author) return res.status(400).json({ error: 'İsim gerekli' });

    const data = readData();
    const memory = {
      id: 'm' + Date.now(),
      author,
      type: type || 'photo',
      time: Date.now(),
      message: message || null,
      files: req.files ? req.files.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        url: `/uploads/${f.filename}`
      })) : []
    };

    data.memories.unshift(memory);
    writeData(data);
    res.json({ success: true, memory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Mesaj anısı yükle
app.post('/api/message', (req, res) => {
  try {
    const { author, message } = req.body;
    if (!author || !message) return res.status(400).json({ error: 'İsim ve mesaj gerekli' });

    const data = readData();
    const memory = {
      id: 'm' + Date.now(),
      author,
      type: 'message',
      time: Date.now(),
      message,
      files: []
    };

    data.memories.unshift(memory);
    writeData(data);
    res.json({ success: true, memory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Anıyı sil
app.delete('/api/memories/:id', (req, res) => {
  try {
    const data = readData();
    const memory = data.memories.find(m => m.id === req.params.id);
    if (memory) {
      // Dosyaları sil
      memory.files.forEach(f => {
        const filePath = path.join(UPLOAD_DIR, f.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    data.memories = data.memories.filter(m => m.id !== req.params.id);
    writeData(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: İstatistikler
app.get('/api/stats', (req, res) => {
  const data = readData();
  const memories = data.memories;
  const stats = {
    total: memories.length,
    photos: memories.filter(m => m.type === 'photo').length,
    videos: memories.filter(m => m.type === 'video').length,
    audios: memories.filter(m => m.type === 'audio').length,
    messages: memories.filter(m => m.type === 'message').length,
    guests: [...new Set(memories.map(m => m.author))].length
  };
  res.json(stats);
});

app.listen(PORT, () => console.log(`Server çalışıyor: http://localhost:${PORT}`));
