// server.js (nova versão com log de erro detalhado)

const express = require('express');
const { Client } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conectar ao banco de dados PostgreSQL usando a variável de ambiente
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => {
    console.log('Conectado ao banco de dados PostgreSQL.');

    // Cria a tabela se ela não existir
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS boletos (
        id SERIAL PRIMARY KEY,
        fornecedor TEXT NOT NULL,
        valor REAL NOT NULL,
        vencimento DATE NOT NULL,
        status TEXT NOT NULL,
        anexo TEXT,
        dataPagamento DATE
      );
    `;
    return client.query(createTableQuery);
  })
  .then(() => {
    console.log("Tabela 'boletos' verificada ou criada.");
  })
  .catch(err => {
    console.error("Erro ao conectar ou criar a tabela:", err.stack);
  });

// --- Rotas da API REST ---

// GET /api/boletos: Busca todos os boletos
app.get('/api/boletos', async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM boletos ORDER BY vencimento;");
    res.json({ boletos: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boletos: Adiciona um novo boleto
app.post('/api/boletos', async (req, res) => {
  try {
    const { fornecedor, valor, vencimento, anexo, status } = req.body;
    const dataPagamento = req.body.dataPagamento || null;

    // Log para verificar o que estamos recebendo e inserindo
    console.log("Dados recebidos para inserção:", { fornecedor, valor, vencimento, anexo, status, dataPagamento });

    const query = 'INSERT INTO boletos (fornecedor, valor, vencimento, anexo, status, dataPagamento) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;';
    const values = [fornecedor, valor, vencimento, anexo, status, dataPagamento];
    const result = await client.query(query, values);
    res.status(201).json({ id: result.rows[0].id, message: "Boleto adicionado com sucesso." });
  } catch (err) {
    // --- AQUI ESTÁ A CORREÇÃO ---
    console.error("Erro na inserção do boleto:", err.message);
    // --- FIM DA CORREÇÃO ---
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/boletos/:id: Atualiza um boleto (usado para marcar como pago)
app.put('/api/boletos/:id', async (req, res) => {
  try {
    const { status, dataPagamento } = req.body;
    const id = req.params.id;
    const query = 'UPDATE boletos SET status = $1, dataPagamento = $2 WHERE id = $3;';
    const values = [status, dataPagamento, id];
    const result = await client.query(query, values);
    if (result.rowCount === 0) {
      res.status(404).json({ message: "Boleto não encontrado." });
    } else {
      res.json({ message: "Boleto atualizado com sucesso." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/boletos/:id: Remove um boleto
app.delete('/api/boletos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = 'DELETE FROM boletos WHERE id = $1;';
    const values = [id];
    const result = await client.query(query, values);
    if (result.rowCount === 0) {
      res.status(404).json({ message: "Boleto não encontrado." });
    } else {
      res.json({ message: "Boleto removido com sucesso." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta http://localhost:${port}`);
});