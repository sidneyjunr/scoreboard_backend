const { JSONBIN_ID, JSONBIN_API_KEY, SAVE_DEBOUNCE_MS, DEFAULT_DATA } = require('./config');

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

let saveTimeout = null;
let pendingSave = false;
let lastSavedJson = null;

async function loadData() {
  try {
    const response = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log('[STORAGE] Dados carregados do JSONBin');
    return { ...DEFAULT_DATA, ...data.record };
  } catch (error) {
    console.error('[STORAGE] Erro ao carregar:', error.message);
    console.warn('[STORAGE] Usando dados padrão');
    return { ...DEFAULT_DATA };
  }
}

async function saveToJsonBin(data) {
  try {
    const response = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    lastSavedJson = JSON.stringify(data);
    console.log('[STORAGE] Dados salvos no JSONBin');
  } catch (error) {
    console.error('[STORAGE] Erro ao salvar:', error.message);
  }
}

function scheduleSave(getData) {
  if (saveTimeout) clearTimeout(saveTimeout);
  pendingSave = true;
  saveTimeout = setTimeout(() => {
    const data = getData();
    const dataJson = JSON.stringify(data);
    if (dataJson !== lastSavedJson) {
      saveToJsonBin(data);
    }
    pendingSave = false;
    saveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
}

async function flushPendingSave(getData) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (pendingSave) {
    console.log('[STORAGE] Salvando dados pendentes antes de encerrar...');
    await saveToJsonBin(getData());
    pendingSave = false;
  }
}

module.exports = { loadData, scheduleSave, flushPendingSave };
