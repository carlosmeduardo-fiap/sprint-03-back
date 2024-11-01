const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const { validateToken, getUserPermissions } = require('./auth')

const app = express();

const PORT = 3000;

app.use(express.json());

app.use(cors());

const db = new sqlite3.Database('banco-de-dados.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER,
    temperature REAL,
    humidity REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'USER',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.post('/auth/sign-up', async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (email, password) VALUES (?, ?)`,
    [email, hashedPassword],
    (err) => {
      if (err) {
        console.error('Erro ao inserir usuário no banco de dados:', err.message);
        return res.status(500).send('Erro ao inserir usuário.');
      }

      return res.status(201).json();
    }
  );
})

app.post('/auth/sign-in', (req, res) => {
  const { email, password } = req.body

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, row) => {
      if (err) {
        console.error('Erro ao buscar usuário no banco de dados:', err.message);
        return res.status(500).send('Erro ao buscar usuário.');
      }

      if (!row) {
        return res.status(401).send('Usuário ou senha incorreto.');
      }

      const isPasswordValid = await bcrypt.compare(password, row.password);

      if (!isPasswordValid) {
        return res.status(401).send('Usuário ou senha incorreto.');
      }

      const token = jwt.sign(
        { role: row.role },
        'my-secret-token',
        {
          subject: String(row.id),
          expiresIn: '60m'
        }
      )
      
      return res.json({ token });
    }
  );
});

app.use('*', validateToken);

app.get('/metrics', (req, res) => {
  const { date } = req.query;

  const { cannot } = getUserPermissions(req.user.role)

  if (cannot('list', 'Metrics')) {
    return res.status(403).send('Acesso negado.');
  }

  const dateFilter = {
    'last-hour': '-60 minutes',
    'last-day': '-24 hours'
  }[date];

  db.all(`SELECT * FROM metrics WHERE date(timestamp) >= date('now', ?)`, [dateFilter], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar dados no banco de dados:', err.message);
      return res.status(500).send('Erro ao buscar os dados.');
    }

    return res.json(rows);
  });
});

app.post('/metrics', (req, res) => {
  const { sensor_id, temperature, humidity } = req.body;

  const { cannot } = getUserPermissions(req.user.role)

  if (cannot('create', 'Metrics')) {
    return res.status(403).send('Acesso negado.');
  }

  db.run(
    `INSERT INTO metrics (sensor_id, temperature, humidity) VALUES (?, ?, ?)`, 
    [sensor_id, temperature, humidity], 
    (err) => {
      if (err) {
        console.error('Erro ao inserir dados no banco de dados:', err.message);
        return res.status(500).send('Erro ao processar os dados.');
      }

      return res.status(201).json();
    }
  );
});

app.delete('/metrics', (_, res) => {
  const { cannot } = getUserPermissions(req.user.role)

  if (cannot('delete', 'Metrics')) {
    return res.status(403).send('Acesso negado.');
  }

  db.run(`DELETE FROM metrics`, [], (err) => {
    if (err) {
      console.error('Erro ao limpar dados do banco de dados:', err.message);
      return res.status(500).send('Erro ao limpar os dados.');
    }

    return res.status(204).json();
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});