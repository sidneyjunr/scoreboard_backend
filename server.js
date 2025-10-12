const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs"); // 1. Módulo para interagir com arquivos
const path = require("path");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 2. Definindo o caminho do nosso "banco de dados" em arquivo
const DB_PATH = path.join(__dirname, "data", "database.json");

// --- NOVAS FUNÇÕES PARA LER E SALVAR OS DADOS ---

function loadData() {
  // Se o arquivo ou diretório não existir, cria e retorna os dados padrão
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); // Cria o diretório 'data' se não existir
    const defaultData = {
      team1_name: "TIME A",
      team1_score: 0,
      team1_fouls: 0,
      team1_logo: "",
      team1_bg_color: "#FF66C4",
      team1_name_color: "#FFFFFF",
      team1_stripe1_color: "#000000",
      team1_stripe2_color: "#000000",
      team2_name: "TIME B",
      team2_score: 0,
      team2_fouls: 0,
      team2_logo: "",
      team2_bg_color: "#008CFF",
      team2_name_color: "#FFFFFF",
      team2_stripe1_color: "#000000",
      team2_stripe2_color: "#000000",
      period: "1º Quarto",
      foul_active_color: "#FFFF00",
      foul_inactive_color: "#FFFFFF",
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  // Se o arquivo existir, lê e retorna os dados
  const data = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(data);
}

function saveData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// 3. A "Fonte da Verdade" agora é carregada do arquivo na inicialização
let scoreData = loadData();

// Rota de teste
app.get("/", (req, res) => {
  res.send("<h1>Servidor do Scoreboard está no ar!</h1>");
});

// 4. Lógica do Socket.IO
io.on("connection", (socket) => {
  console.log(`Usuário conectado com o ID: ${socket.id}`);
  socket.emit("update", scoreData);

  socket.on("updateScore", (newData) => {
    newData.team1_score = Math.max(0, newData.team1_score);
    newData.team2_score = Math.max(0, newData.team2_score);
    newData.team1_fouls = Math.max(0, Math.min(5, newData.team1_fouls));
    newData.team2_fouls = Math.max(0, Math.min(5, newData.team2_fouls));

    scoreData = newData;
    saveData(scoreData); // 5. Salva os dados no arquivo a cada atualização!

    console.log("Dados validados e salvos:", scoreData);
    io.emit("update", scoreData);
  });

  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

// Iniciar o Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});
