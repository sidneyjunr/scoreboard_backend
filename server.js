const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { PORT } = require('./config');
const { validateScoreData } = require('./validation');
const { loadData, scheduleSave, flushPendingSave } = require('./storage');
const { setupRoutes } = require('./routes');
const { setupSocket } = require('./socket');

// --- Setup ---
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT'] },
});

let scoreData = {};

function getState() {
  return scoreData;
}

function updateAndBroadcast(newData) {
  scoreData = validateScoreData(newData, scoreData);
  io.emit('update', scoreData);     // Emite PRIMEIRO (instantâneo ~10ms)
  scheduleSave(() => scoreData);     // Salva em background (debounce 3s)
}

setupRoutes(app, getState, updateAndBroadcast);
setupSocket(io, getState, updateAndBroadcast);

// --- Graceful shutdown ---
async function shutdown(signal) {
  console.log(`\n[SERVER] ${signal} recebido. Salvando dados pendentes...`);
  await flushPendingSave(() => scoreData);
  server.close(() => {
    console.log('[SERVER] Encerrado.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// --- Startup ---
async function start() {
  scoreData = await loadData();
  server.listen(PORT, () => {
    console.log(`[SERVER] Rodando em http://localhost:${PORT}`);
  });
}

start();
