const { validateScoreData } = require('./validation');

function setupSocket(io, getState, updateAndBroadcast) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Conectado: ${socket.id}`);
    socket.emit('update', getState());

    socket.on('updateScore', (newData) => {
      if (!newData || typeof newData !== 'object') return;
      const validated = validateScoreData(newData, getState());
      updateAndBroadcast(validated);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Desconectado: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
