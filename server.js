// server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para processar JSON e servir arquivos estáticos
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conectar ao banco de dados SQLite. O arquivo será criado se não existir.
const db = new sqlite3.Database('./boletos.db', (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
        db.run(`CREATE TABLE IF NOT EXISTS boletos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fornecedor TEXT NOT NULL,
            valor REAL NOT NULL,
            vencimento TEXT NOT NULL,
            status TEXT NOT NULL,
            anexo TEXT,
            dataPagamento TEXT
        )`, (err) => {
            if (err) {
                console.error("Erro ao criar a tabela 'boletos'.", err.message);
            }
        });
    }
});

// --- Rotas da API REST para o seu site ---

// GET /api/boletos: Busca todos os boletos
app.get('/api/boletos', (req, res) => {
    db.all("SELECT * FROM boletos ORDER BY vencimento", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ boletos: rows });
    });
});

// POST /api/boletos: Adiciona um novo boleto
app.post('/api/boletos', (req, res) => {
    const { fornecedor, valor, vencimento, anexo, status } = req.body;
    const dataPagamento = req.body.dataPagamento || null;

    db.run(`INSERT INTO boletos (fornecedor, valor, vencimento, anexo, status, dataPagamento) VALUES (?, ?, ?, ?, ?, ?)`,
        [fornecedor, valor, vencimento, anexo, status, dataPagamento],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, message: "Boleto adicionado com sucesso." });
        });
});

// PUT /api/boletos/:id: Atualiza um boleto (usado para marcar como pago)
app.put('/api/boletos/:id', (req, res) => {
    const { status, dataPagamento } = req.body;
    const id = req.params.id;

    db.run(`UPDATE boletos SET status = ?, dataPagamento = ? WHERE id = ?`,
        [status, dataPagamento, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ message: "Boleto não encontrado." });
            } else {
                res.json({ message: "Boleto atualizado com sucesso." });
            }
        });
});

// DELETE /api/boletos/:id: Remove um boleto
app.delete('/api/boletos/:id', (req, res) => {
    const id = req.params.id;

    db.run(`DELETE FROM boletos WHERE id = ?`, id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ message: "Boleto não encontrado." });
        } else {
            res.json({ message: "Boleto removido com sucesso." });
        }
    });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta http://localhost:${port}`);
});