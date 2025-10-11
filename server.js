// 1. Importação dos pacotes (sem mudanças)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// 2. Configuração inicial (sem mudanças)
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 3. Lógica do Scoreboard - "Fonte da Verdade"
// Este objeto é a memória do servidor. Ele não reseta a menos que o servidor seja reiniciado.
let scoreData = {
  // --- DADOS DO TIME 1 ---
  team1_name: "TIME A",
  team1_score: 0,
  team1_fouls: 0,
  team1_logo: "",
  // Cores do Time 1
  team1_bg_color: "#FF66C4", // Cor de Fundo
  team1_name_color: "#FFFFFF", // Cor do Nome
  team1_stripe1_color: "#000000", // Cor da Faixa 1
  team1_stripe2_color: "#000000", // Cor da Faixa 2

  // --- DADOS DO TIME 2 ---
  team2_name: "TIME B",
  team2_score: 0,
  team2_fouls: 0,
  team2_logo: "",
  // Cores do Time 2
  team2_bg_color: "#008CFF", // Cor de Fundo
  team2_name_color: "#FFFFFF", // Cor do Nome
  team2_stripe1_color: "#000000", // Cor da Faixa 1
  team2_stripe2_color: "#000000", // Cor da Faixa 2

  // --- DADOS GERAIS ---
  period: "2P",
  foul_active_color: "#FFFF00", // Cor Falta Ativada
  foul_inactive_color: "#FFFFFF", // Cor Falta Desativada
};

// Rota de teste (sem mudanças)
app.get("/", (req, res) => {
  res.send("<h1>Servidor do Scoreboard está no ar!</h1>");
});

// 4. Lógica do Socket.IO (sem mudanças na lógica principal)
io.on("connection", (socket) => {
  console.log(`Usuário conectado com o ID: ${socket.id}`);

  // ESSA LINHA É A CHAVE DA PERSISTÊNCIA:
  // Envia os dados atuais do servidor para o cliente que acabou de se conectar.
  socket.emit("update", scoreData);

  socket.on('updateScore', (newData) => {
    // --- INÍCIO DA TRAVA DE SEGURANÇA ---
    // Garante que os pontos nunca sejam negativos
    newData.team1_score = Math.max(0, newData.team1_score);
    newData.team2_score = Math.max(0, newData.team2_score);

    // Garante que as faltas fiquem entre 0 e 5
    newData.team1_fouls = Math.max(0, Math.min(5, newData.team1_fouls));
    newData.team2_fouls = Math.max(0, Math.min(5, newData.team2_fouls));

    scoreData = newData; // Atualiza a "fonte da verdade" no servidor
    console.log('Dados validados e atualizados no servidor:', scoreData);

    // Envia os novos dados para TODOS os clientes conectados
    io.emit('update', scoreData);
  });

  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

// 5. Iniciar o Servidor (sem mudanças)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
