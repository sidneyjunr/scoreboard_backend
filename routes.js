const { sanitizeValue, VALID_FIELDS } = require('./validation');

function setupRoutes(app, getState, updateAndBroadcast) {
  // Zerar score (rota mais específica primeiro)
  app.get('/score/:team/reset', (req, res) => {
    const { team } = req.params;
    if (team !== 'team1' && team !== 'team2') {
      return res.status(400).json({ success: false, message: 'Time inválido' });
    }
    updateAndBroadcast({ ...getState(), [`${team}_score`]: 0 });
    res.json({ success: true, message: `Score ${team} zerado` });
  });

  // Adicionar/subtrair pontos
  app.get('/score/:team/:value', (req, res) => {
    const { team } = req.params;
    const value = parseInt(req.params.value);

    if ((team !== 'team1' && team !== 'team2') || isNaN(value)) {
      return res.status(400).json({ success: false, message: 'Time ou valor inválido' });
    }

    const state = getState();
    const newScore = (state[`${team}_score`] || 0) + value;
    if (newScore < 0) {
      return res.status(400).json({ success: false, message: 'Score não pode ser negativo' });
    }

    updateAndBroadcast({ ...state, [`${team}_score`]: newScore });
    res.json({ success: true, message: `Score ${team}: ${newScore}` });
  });

  // Adicionar/remover faltas
  app.get('/foul/:team/:action', (req, res) => {
    const { team, action } = req.params;
    if (team !== 'team1' && team !== 'team2') {
      return res.status(400).json({ success: false, message: 'Time inválido' });
    }
    if (action !== 'add' && action !== 'remove') {
      return res.status(400).json({ success: false, message: 'Ação inválida' });
    }

    const state = getState();
    const foulKey = `${team}_fouls`;
    let fouls = state[foulKey] || 0;

    if (action === 'add' && fouls < 5) fouls++;
    else if (action === 'remove' && fouls > 0) fouls--;
    else return res.json({ success: false, message: 'Limite atingido ou já zero' });

    updateAndBroadcast({ ...state, [foulKey]: fouls });
    res.json({ success: true, message: `Faltas ${team}: ${fouls}` });
  });

  // Definir campo diretamente
  app.post('/set/:field', (req, res) => {
    const { field } = req.params;
    const { value } = req.body;

    if (!VALID_FIELDS.includes(field)) {
      return res.status(400).json({ success: false, message: 'Campo inválido' });
    }
    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Valor ausente no body' });
    }

    const sanitized = sanitizeValue(field, value);
    updateAndBroadcast({ ...getState(), [field]: sanitized });
    res.json({ success: true, message: `${field} = ${sanitized}` });
  });
}

module.exports = { setupRoutes };
