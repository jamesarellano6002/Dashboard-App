const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Allow requests from your GitHub Pages website.
// Set FRONTEND_ORIGIN in Render to: https://jamesarellano6002.github.io
const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigin === '*' || !origin || origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : allowedOrigin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Render persistent disk path; locally it uses the project folder.
const dataDirectory = process.env.DB_DIR || __dirname;
fs.mkdirSync(dataDirectory, { recursive: true });
const db = new Database(path.join(dataDirectory, 'dashboard.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS fish (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fish_class TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0
  )
`);

// Add sample records only when the online database is empty.
if (db.prepare('SELECT COUNT(*) AS c FROM fish').get().c === 0) {
  const insert = db.prepare(
    'INSERT INTO fish (name, fish_class, price, quantity) VALUES (?, ?, ?, ?)'
  );
  insert.run('Tilapia', 'Bony Fish', 3.5, 120);
  insert.run('Salmon', 'Bony Fish', 12.0, 45);
  insert.run('Tuna', 'Bony Fish', 15.5, 3);
  insert.run('Stingray', 'Cartilaginous Fish', 9.0, 20);
  insert.run('Lamprey', 'Jawless Fish', 7.25, 4);
}

app.get('/', (req, res) => {
  res.json({ message: 'Fish Inventory API is running' });
});

// READ all fish
app.get('/api/fish', (req, res) => {
  res.json(db.prepare('SELECT * FROM fish ORDER BY id DESC').all());
});

// Dashboard statistics
app.get('/api/stats', (req, res) => {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS totalFish,
      COALESCE(SUM(price * quantity), 0) AS stockValue,
      COALESCE(SUM(CASE WHEN quantity < 5 THEN 1 ELSE 0 END), 0) AS lowStock
    FROM fish
  `).get();

  const byClass = db.prepare(`
    SELECT fish_class, COUNT(*) AS species, COALESCE(SUM(quantity), 0) AS totalQty
    FROM fish
    GROUP BY fish_class
  `).all();

  res.json({ ...totals, byClass });
});

// CREATE
app.post('/api/fish', (req, res) => {
  const { name, fish_class, price, quantity } = req.body;

  if (!String(name || '').trim() || !String(fish_class || '').trim()) {
    return res.status(400).json({ error: 'Name and class are required.' });
  }

  const numericPrice = Number(price);
  const numericQuantity = Number(quantity);

  if (!Number.isFinite(numericPrice) || numericPrice < 0 ||
      !Number.isInteger(numericQuantity) || numericQuantity < 0) {
    return res.status(400).json({ error: 'Enter a valid price and whole-number quantity.' });
  }

  const result = db.prepare(
    'INSERT INTO fish (name, fish_class, price, quantity) VALUES (?, ?, ?, ?)'
  ).run(String(name).trim(), String(fish_class).trim(), numericPrice, numericQuantity);

  res.status(201).json({ id: result.lastInsertRowid });
});

// UPDATE
app.put('/api/fish/:id', (req, res) => {
  const { name, fish_class, price, quantity } = req.body;
  const numericPrice = Number(price);
  const numericQuantity = Number(quantity);

  if (!String(name || '').trim() || !String(fish_class || '').trim() ||
      !Number.isFinite(numericPrice) || numericPrice < 0 ||
      !Number.isInteger(numericQuantity) || numericQuantity < 0) {
    return res.status(400).json({ error: 'Enter valid fish details.' });
  }

  const result = db.prepare(
    'UPDATE fish SET name=?, fish_class=?, price=?, quantity=? WHERE id=?'
  ).run(String(name).trim(), String(fish_class).trim(), numericPrice, numericQuantity, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Fish not found.' });
  res.json({ success: true });
});

// DELETE
app.delete('/api/fish/:id', (req, res) => {
  const result = db.prepare('DELETE FROM fish WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Fish not found.' });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fish Inventory API listening on port ${PORT}`);
});
