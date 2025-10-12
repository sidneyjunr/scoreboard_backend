const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// --- CONFIGURAÇÃO DO JSONBIN ---
const JSONBIN_ID = '68eb2129ae596e708f0f30b3'; // Ex: '671d8e12e41b4d34e40e34a6'
const JSONBIN_API_KEY = '$2a$10$p1M/DBZcMGHb0OLG/HqUEOgYYHug6ugaSA3UQ11Biu3UgPadIdvWy'; // Ex: '$2a$10$abcdefghijklmnopqrstuvwx'
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

// --- Configuração do Servidor ---
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let scoreData = {}; // Começa vazio, será carregado da internet

// --- NOVAS FUNÇÕES PARA LER E SALVAR OS DADOS NO JSONBIN ---
async function loadData() {
  try {
    const response = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    if (!response.ok) throw new Error('Falha ao carregar dados');
    const data = await response.json();
    return data.record;
  } catch (error) {
    console.error("Erro ao carregar dados do JSONBin:", error);
    // Retorna um objeto padrão em caso de falha
    return { team1_name: "ERRO", team2_name: "ERRO" };
  }
}

async function saveData(data) {
  try {
    await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error("Erro ao salvar dados no JSONBin:", error);
  }
}

// --- LÓGICA DO SOCKET.IO ---
io.on("connection", (socket) => {
  console.log(`Usuário conectado com o ID: ${socket.id}`);
  socket.emit("update", scoreData);

  socket.on('updateScore', async (newData) => {
    newData.team1_score = Math.max(0, newData.team1_score);
    newData.team2_score = Math.max(0, newData.team2_score);
    newData.team1_fouls = Math.max(0, Math.min(5, newData.team1_fouls));
    newData.team2_fouls = Math.max(0, Math.min(5, newData.team2_fouls));

    scoreData = newData;
    await saveData(scoreData); // Salva os dados no JSONBin

    console.log('Dados validados e salvos no JSONBin:', scoreData);
    io.emit('update', scoreData);
  });

  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
async function startServer() {
  scoreData = await loadData(); // Carrega os dados do JSONBin antes de iniciar
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
    console.log('Dados iniciais carregados com sucesso!');
  });
}

startServer();