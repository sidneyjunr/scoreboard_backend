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
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT"] },
});

let scoreData = {};

// --- Funções loadData e saveData ---
async function loadData() {
  try {
    const response = await fetch(`${JSONBIN_URL}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
    if (!response.ok) throw new Error(`Falha ao carregar dados (${response.status})`);
    const data = await response.json();
    console.log("Dados carregados do JSONBin com sucesso.");
    return data.record;
  } catch (error) {
    console.error("Erro ao carregar dados do JSONBin:", error);
    const defaultData = { team1_name: "TIME A", team1_score: 0, team1_fouls: 0, /* ...todos os outros campos padrão... */ team2_name: "TIME B", team2_score: 0, team2_fouls: 0, period: "1º Quarto" };
    console.warn("Retornando dados padrão devido a erro.");
    return defaultData;
  }
}

async function saveData(data) {
  try {
    const response = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY },
      body: JSON.stringify(data)
    });
     if (!response.ok) throw new Error(`Falha ao salvar dados (${response.status})`);
     console.log("Dados salvos no JSONBin com sucesso.");
  } catch (error) {
    console.error("Erro ao salvar dados no JSONBin:", error);
  }
}

// --- LÓGICA DE VALIDAÇÃO E ATUALIZAÇÃO ---
async function updateAndBroadcast(newData) {
  newData.team1_score = Math.max(0, newData.team1_score || 0);
  newData.team2_score = Math.max(0, newData.team2_score || 0);
  newData.team1_fouls = Math.max(0, Math.min(5, newData.team1_fouls || 0));
  newData.team2_fouls = Math.max(0, Math.min(5, newData.team2_fouls || 0));
  scoreData = newData;
  await saveData(scoreData);
  io.emit('update', scoreData);
  console.log('Dados atualizados via HTTP/Stream Deck:', scoreData);
}


// --- ROTAS HTTP PARA O STREAM DECK (ORDEM CORRIGIDA) ---

// Rota para zerar pontos (MAIS ESPECÍFICA - VEM PRIMEIRO)
app.get('/score/:team/reset', async (req, res) => {
    const team = req.params.team;
     if (team === 'team1' || team === 'team2') {
        const scoreKey = `${team}_score`;
        const updatedData = { ...scoreData, [scoreKey]: 0 };
        await updateAndBroadcast(updatedData);
        res.json({ success: true, message: `Score ${team} reset`, scoreData });
     } else {
        res.status(400).json({ success: false, message: 'Invalid team'});
     }
});

// Rota para adicionar/subtrair pontos (MAIS GENÉRICA - VEM DEPOIS)
app.get('/score/:team/:value', async (req, res) => {
  const team = req.params.team;
  const value = parseInt(req.params.value);

  if ((team === 'team1' || team === 'team2') && !isNaN(value)) {
    const scoreKey = `${team}_score`;
    const newScore = (scoreData[scoreKey] || 0) + value;
    if (newScore >= 0) {
      const updatedData = { ...scoreData, [scoreKey]: newScore };
      await updateAndBroadcast(updatedData);
      res.json({ success: true, message: `Score ${team} updated to ${newScore}`, scoreData });
    } else {
      res.status(400).json({ success: false, message: 'Score cannot be negative' });
    }
  } else {
    // Se o :value não for um número, a rota /reset já foi testada e falhou (ou não era /reset)
    // Então, ou o time é inválido ou o valor realmente não é um número.
    res.status(400).json({ success: false, message: 'Invalid team or value is not a number' });
  }
});

// Rota para adicionar/subtrair faltas
app.get('/foul/:team/:action', async (req, res) => {
  const team = req.params.team;
  const action = req.params.action;
  const foulKey = `${team}_fouls`;
  let currentFouls = scoreData[foulKey] || 0;
  let newFouls = currentFouls;

  if (action === 'add' && currentFouls < 5) newFouls++;
  else if (action === 'remove' && currentFouls > 0) newFouls--;

  if (newFouls !== currentFouls && (team === 'team1' || team === 'team2')) {
    const updatedData = { ...scoreData, [foulKey]: newFouls };
    await updateAndBroadcast(updatedData);
    res.json({ success: true, message: `Fouls ${team} updated to ${newFouls}`, scoreData });
  } else if (team !== 'team1' && team !== 'team2') {
      res.status(400).json({ success: false, message: 'Invalid team' });
  } else {
      res.json({ success: false, message: 'Foul limit reached or already zero', scoreData });
  }
});

// Rota para definir um valor específico
app.post('/set/:field', async (req, res) => {
    const field = req.params.field;
    const value = req.body.value;
    if (scoreData.hasOwnProperty(field) && value !== undefined) {
        let validatedValue = value;
        if (field === 'team1_score' || field === 'team2_score') validatedValue = Math.max(0, parseInt(value) || 0);
        if (field === 'team1_fouls' || field === 'team2_fouls') validatedValue = Math.max(0, Math.min(5, parseInt(value) || 0));
        const updatedData = { ...scoreData, [field]: validatedValue };
        await updateAndBroadcast(updatedData);
        res.json({ success: true, message: `${field} set to ${validatedValue}`, scoreData });
    } else {
         res.status(400).json({ success: false, message: 'Invalid field or missing value in body'});
    }
});

// --- LÓGICA DO SOCKET.IO ---
io.on("connection", (socket) => {
  console.log(`Usuário conectado com o ID: ${socket.id}`);
  socket.emit("update", scoreData);
  socket.on('updateScore', async (newData) => { await updateAndBroadcast(newData); });
  socket.on("disconnect", () => { console.log(`Usuário desconectado: ${socket.id}`); });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
async function startServer() {
  scoreData = await loadData();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
    if (scoreData && scoreData.team1_name !== "ERRO") console.log('Dados iniciais carregados com sucesso!');
    else console.error('Falha ao carregar dados iniciais! Verifique as chaves do JSONBin.');
  });
}
startServer();