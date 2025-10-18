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
app.use(express.json()); // Habilita o Express para entender JSON (útil para futuras expansões)
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT"] }, // Adicione PUT se ainda não estiver
});

let scoreData = {};

// --- Funções loadData e saveData (sem mudanças) ---
async function loadData() { /* ... código igual ao anterior ... */ }
async function saveData(data) { /* ... código igual ao anterior ... */ }

// --- LÓGICA DE VALIDAÇÃO E ATUALIZAÇÃO ---
// Função auxiliar para evitar repetição de código
async function updateAndBroadcast(newData) {
  // Aplica validações
  newData.team1_score = Math.max(0, newData.team1_score || 0);
  newData.team2_score = Math.max(0, newData.team2_score || 0);
  newData.team1_fouls = Math.max(0, Math.min(5, newData.team1_fouls || 0));
  newData.team2_fouls = Math.max(0, Math.min(5, newData.team2_fouls || 0));

  scoreData = newData; // Atualiza a memória local
  await saveData(scoreData); // Salva no JSONBin
  io.emit('update', scoreData); // Envia para todos os clientes
  console.log('Dados atualizados via HTTP/Stream Deck:', scoreData);
}


// --- NOVAS ROTAS HTTP PARA O STREAM DECK ---

// Rota para adicionar/subtrair pontos
// Ex: GET /score/team1/1 (adiciona 1 ponto ao time 1)
// Ex: GET /score/team2/-1 (subtrai 1 ponto do time 2)
app.get('/score/:team/:value', async (req, res) => {
  const team = req.params.team; // 'team1' or 'team2'
  const value = parseInt(req.params.value);

  if ((team === 'team1' || team === 'team2') && !isNaN(value)) {
    const scoreKey = `${team}_score`;
    const newScore = (scoreData[scoreKey] || 0) + value;

    // Aplica a validação de não negativo ANTES de atualizar
    if (newScore >= 0) {
      const updatedData = { ...scoreData, [scoreKey]: newScore };
      await updateAndBroadcast(updatedData);
      res.json({ success: true, message: `Score ${team} updated to ${newScore}`, scoreData });
    } else {
      res.status(400).json({ success: false, message: 'Score cannot be negative' });
    }
  } else {
    res.status(400).json({ success: false, message: 'Invalid team or value' });
  }
});

// Rota para zerar pontos
// Ex: GET /score/team1/reset
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


// Rota para adicionar/subtrair faltas
// Ex: GET /foul/team1/add
// Ex: GET /foul/team2/remove
app.get('/foul/:team/:action', async (req, res) => {
  const team = req.params.team; // 'team1' or 'team2'
  const action = req.params.action; // 'add' or 'remove'
  const foulKey = `${team}_fouls`;
  let currentFouls = scoreData[foulKey] || 0;
  let newFouls = currentFouls;

  if (action === 'add' && currentFouls < 5) {
    newFouls++;
  } else if (action === 'remove' && currentFouls > 0) {
    newFouls--;
  }

  if (newFouls !== currentFouls && (team === 'team1' || team === 'team2')) {
    const updatedData = { ...scoreData, [foulKey]: newFouls };
    await updateAndBroadcast(updatedData);
    res.json({ success: true, message: `Fouls ${team} updated to ${newFouls}`, scoreData });
  } else if (team !== 'team1' && team !== 'team2') {
      res.status(400).json({ success: false, message: 'Invalid team' });
  }
  else {
      // Se não houve mudança (tentou adicionar com 5 ou remover com 0)
      res.json({ success: false, message: 'Foul limit reached or already zero', scoreData });
  }
});

// Rota para definir um valor específico (opcional, mas útil)
// Ex: POST /set/team1_score com body {"value": 100}
// Ex: POST /set/period com body {"value": "Intervalo"}
app.post('/set/:field', async (req, res) => {
    const field = req.params.field;
    const value = req.body.value; // Pega o valor do corpo da requisição

    if (scoreData.hasOwnProperty(field) && value !== undefined) {
        let validatedValue = value;
        // Adiciona validações específicas se necessário
        if (field === 'team1_score' || field === 'team2_score') {
            validatedValue = Math.max(0, parseInt(value) || 0);
        }
        if (field === 'team1_fouls' || field === 'team2_fouls') {
             validatedValue = Math.max(0, Math.min(5, parseInt(value) || 0));
        }

        const updatedData = { ...scoreData, [field]: validatedValue };
        await updateAndBroadcast(updatedData);
        res.json({ success: true, message: `${field} set to ${validatedValue}`, scoreData });
    } else {
         res.status(400).json({ success: false, message: 'Invalid field or missing value in body'});
    }
});


// --- LÓGICA DO SOCKET.IO (sem mudanças) ---
io.on("connection", (socket) => {
  console.log(`Usuário conectado com o ID: ${socket.id}`);
  socket.emit("update", scoreData); // Envia estado atual ao conectar

  // Listener para atualizações vindas do painel web (control.html)
  socket.on('updateScore', async (newData) => {
    // A função updateAndBroadcast já contém as validações
    await updateAndBroadcast(newData);
  });

  socket.on("disconnect", () => { console.log(`Usuário desconectado: ${socket.id}`); });
});

// --- INICIALIZAÇÃO DO SERVIDOR (sem mudanças) ---
async function startServer() { /* ... código igual ao anterior ... */ }
startServer();

// (Certifique-se que as funções loadData e saveData estão completas como na resposta anterior)
async function loadData() {
  try {
    const response = await fetch(`${JSONBIN_URL}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
    if (!response.ok) throw new Error(`Falha ao carregar dados (${response.status})`);
    const data = await response.json();
    console.log("Dados carregados do JSONBin com sucesso.");
    return data.record;
  } catch (error) {
    console.error("Erro ao carregar dados do JSONBin:", error);
    // Cria/retorna um estado padrão seguro em caso de falha TOTAL
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

async function startServer() {
  scoreData = await loadData();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta http://localhost:${PORT}`);
    if (scoreData && scoreData.team1_name !== "ERRO") {
         console.log('Dados iniciais carregados com sucesso!');
    } else {
         console.error('Falha ao carregar dados iniciais! Verifique as chaves do JSONBin.');
    }
  });
}