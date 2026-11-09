const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('dashboard.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS fish (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fish_class TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0
  )
`);

// Seed sample data if empty
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

// READ all
app.get('/api/fish', (req, res) => {
  res.json(db.prepare('SELECT * FROM fish ORDER BY id DESC').all());
});

// Dashboard stats
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
  if (!name || !fish_class) {
    return res.status(400).json({ error: 'Name and class are required' });
  }
  const result = db
    .prepare('INSERT INTO fish (name, fish_class, price, quantity) VALUES (?, ?, ?, ?)')
    .run(name, fish_class, Number(price) || 0, Number(quantity) || 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

// UPDATE
app.put('/api/fish/:id', (req, res) => {
  const { name, fish_class, price, quantity } = req.body;
  const result = db
    .prepare('UPDATE fish SET name=?, fish_class=?, price=?, quantity=? WHERE id=?')
    .run(name, fish_class, Number(price) || 0, Number(quantity) || 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// DELETE
app.delete('/api/fish/:id', (req, res) => {
  const result = db.prepare('DELETE FROM fish WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Dashboard running at http://localhost:${PORT}`));